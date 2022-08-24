import { ChainStatus } from "./../types/enums/ChainStatus";
import { chainRepository } from "./../repositories/chainRepository";
import { blockRepository } from "./../repositories/blockRepository";
import { executionManager } from "./../executionManager";
import { indexingService } from "./indexingService";
import cron from "node-cron";
import cluster from "cluster";
import os from "os";

const INCREMENT = "INCREMENT";
const COUNTER = "COUNTER";
const SLOT = "SLOT";
const cpuCores = os.cpus().length;

export const clusterService = {

    retrieveSlots(): void {
        process.send!({ topic: SLOT });
    },

    incrementCounter(): void {
        process.send!({ topic: INCREMENT });
    },

    async indexSlots(endpoint: string): Promise<void> {
        let slots: number[][] = [];
        if (cluster.isPrimary) {
            slots = await executionManager.createSlots(endpoint, cpuCores);

            let counter = 0;
            for (let i = 0; i < slots.length; i++) {
                cluster.fork();
            }

            cluster.on("exit", (worker: any) => {
                console.log("Worker " + worker.id + " died.");
            });

            cluster.on("message", (worker: any, msg: any) => {
                if (msg.topic === INCREMENT) {
                    counter++;
                    worker.send({ topic: COUNTER, value: counter - 1 });
                }
                if (msg.topic === SLOT) {
                    worker.send({ topic: SLOT, value: slots });
                }
            });

            cron.schedule("0 */30 * * * *", async () => {
                const chain = await chainRepository.findByWsProvider(endpoint);
                const indexThreshold = slots.reduce((acc: number[], curr: number[]) => { return acc[1] > curr[1] ? acc : curr })[1];
                console.log("Checking if indexing for " + chain!.chain_name + " has finished...");
                const orphanBlocks = await blockRepository.getOrphanBlocksUnderBlockNumber(indexThreshold, chain!.id);
                if (!orphanBlocks) {
                    chain!.status = ChainStatus.Indexed;
                    chainRepository.update(chain!);
                    console.log("Chain " + chain!.chain_name + " is now indexed. You can close this window.");
                } else {
                    console.log("Chain " + chain!.chain_name + " is still indexing.");
                }
            });

            console.log("Indexing will commence in " + slots.length + " batches.");

        } else if (cluster.isWorker) {
            // retrieve slots
            setTimeout(this.retrieveSlots, 100 * cluster.worker!.id);
            process.on("message", (msg: any) => {
                if (msg.topic === SLOT) {
                    slots = msg.value;
                }
            });

            // retrieve counter to know which slot the worker should use
            setTimeout(this.incrementCounter, 100 * cluster.worker!.id);
            process.on("message", async (msg: any) => {
                if (msg.topic === COUNTER) {
                    if (msg.value <= slots.length) {
                        const from = slots[msg.value][1];
                        const to = slots[msg.value][0];
                        console.log("[Worker " + cluster.worker?.id + "]: Indexing start: " + new Date() + " from: " + from + " to: " + to);
                        await indexingService.indexChain(endpoint, from, to);
                    }
                }
            });
        }
    }
};