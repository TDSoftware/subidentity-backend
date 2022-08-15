import { config } from "dotenv";
config();

import { indexingService } from './services/indexingService';
import { ApiPromise, WsProvider } from "@polkadot/api";
import cluster from 'cluster';
import minimist from "minimist";

const args = minimist(process.argv.slice(2));

const INCREMENT = 'INCREMENT';
const COUNTER = 'COUNTER';
const cpuCores = require('os').cpus().length;

export const executionManager = {

    async initiateIndexing(slotCount: number, endpoint: string) {
        const wsProvider = new WsProvider(endpoint);
        const api = await ApiPromise.create({ provider: wsProvider });

        const latestBlock = await api.rpc.chain.getHeader().then(header => {
            return header.number.toNumber();
        }).catch(err => {
            console.log(err);
        }).finally(() => {
            api.disconnect();
        });

        const slots = this.createSlots(0, Number(latestBlock), slotCount);
        this.indexSlots(slots, endpoint)
    },

    createSlots(from: number, to: number, slotCount: number): number[][] {
        const span = to - from;
        const slotSpan = span / slotCount;
        const slots = [];
        const slotsWithNext = [];
        for (let i = 0; i < slotCount; i++) {
            const slot = Math.round(from + (slotSpan * i));
            slots.push(slot);
        }
        for (let i = 0; i < slots.length; i++) {
            const nextSlot = i + 1 < slots.length ? slots[i + 1] : to;
            slotsWithNext.push([slots[i], nextSlot - 1]);
        }
        return slotsWithNext;
    },

    indexSlots(slots: number[][], endpoint: string) {
        if (cluster.isPrimary) {
            for (let i = 0; i < cpuCores; i++) {
                cluster.fork();
            }

            let counter = 0;

            //TODO proper cluster disconnect handling
            cluster.on('exit', (worker, code, signal) => {
                console.log("worker " + worker.id + " died");
            });

            cluster.on('message', (worker, msg, handle) => {
                if (msg.topic === INCREMENT) {
                    counter++
                    worker.send({ topic: COUNTER, value: counter - 1 });
                }
            });
            console.log("Indexing will start on " + cpuCores + " cores.");
        } else {
            function incrementCounter() {
                process.send!({ topic: INCREMENT });
            }
            setTimeout(incrementCounter, 1000 * cluster.worker!.id);
            process.on('message', (msg: any) => {
                if(msg.value <= slots.length){
                    indexingService.indexChain(endpoint, slots[msg.value][1], slots[msg.value][0]);
                }
            });
        }
    }
}

executionManager.initiateIndexing(cpuCores, args.endpoint);

