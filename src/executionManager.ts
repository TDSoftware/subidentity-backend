import { config } from "dotenv";
config();

import minimist from "minimist";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { ChainEntity } from "./types/entities/ChainEntity";
import { Header } from "@polkadot/types/interfaces";
import { blockRepository } from "./repositories/blockRepository";
import { chainService } from "./services/chainService";
import { clusterService } from "./services/clusterService";
import os from "os";

let chain: ChainEntity;
const cpuCores = os.cpus().length;
const args = minimist(process.argv.slice(2));

export const executionManager = {
    /*
    * This function calculcates the range of blocks that each worker should index.
    * The calculation is based on the cpu cores of the executing machine.
    */
    async createSlots(endpoint: string, slotCount: number): Promise<number[][]> {
        chain = chain = await chainService.getChainEntityByWsProvider(endpoint);
        const wsProvider = new WsProvider(endpoint);
        const api = await ApiPromise.create({ provider: wsProvider });

        const latestBlock = await api.rpc.chain.getHeader().then((header: Header) => header.number.toNumber());
        const slots = [];
        let slotsWithNext: number[][] = [];
        const blockCount = await blockRepository.getBlockCount(chain.id);

        if (blockCount === 0) {
            console.log("No blocks found for " + chain.chain_name + ". Calculating slots...");
            const slotSpan = latestBlock / slotCount;
            for (let i = 0; i < slotCount; i++) {
                const slot = Math.round(0 + (slotSpan * i));
                slots.push(slot);
            }
            for (let i = 0; i < slots.length; i++) {
                const nextSlot = i + 1 < slots.length ? slots[i + 1] : latestBlock;
                slotsWithNext.push([slots[i] === 0 ? 1 : slots[i], nextSlot - 1]);
            }
        } else if (blockCount > 0) {
            slotsWithNext = await this.recalculateSlots();
        }
        return slotsWithNext;
    },

    // responsible for recalculating slots when the indexer is restarted
    async recalculateSlots(): Promise<number[][]> {
        console.log("Continuing indexing " + chain.chain_name + ", recalculating slots...");
        const slotsWithNext = [];
        const orphanBlocks = await blockRepository.getOrphanBlocks(chain.id);
        for (let i = 0; i < orphanBlocks.length; i++) {
            const firstBlockWithLowerNumber = await blockRepository.getFirstBlockWithLowerNumber(orphanBlocks[i].number, chain.id);
            const toNum: number = firstBlockWithLowerNumber === undefined ? 1 : firstBlockWithLowerNumber.number + 1;
            slotsWithNext.push([toNum, orphanBlocks[i].number]);
        }
        while (slotsWithNext.length < cpuCores) {
            this.splitSlots(slotsWithNext);
        }
        return slotsWithNext;
    },

    // we split them because in the end there might be less slots because some finished and some were slower (potentially due to crashes, higher blocks etc.)
    // we always want to utilize our cpu cores to the fullest, so we split the biggest slots until we have the same amount of slots as cpu cores
    splitSlots(slotsWithNext: number[][]): number[][] {
        slotsWithNext.sort((a: number[], b: number[]) => b[1] - b[0] - (a[1] - a[0]));
        const biggestSlot: number[] = slotsWithNext[0];
        const slotSpan = biggestSlot[1] - biggestSlot[0];
        const newSlot = [biggestSlot[0], biggestSlot[0] + Math.round(slotSpan / 2)];
        slotsWithNext.push(newSlot);
        slotsWithNext[0] = [newSlot[1] + 1, biggestSlot[1]];
        return slotsWithNext;
    }
};

// this starts the whole indexing service (including worker creation)
clusterService.indexSlots(args.endpoint);