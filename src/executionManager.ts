import { config } from "dotenv";
config();

import minimist from "minimist";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { ChainEntity } from "./types/entities/ChainEntity";
import { Header } from "@polkadot/types/interfaces";
import { blockRepository } from "./repositories/blockRepository";
import { chainService } from "./services/chainService";
import { clusterService } from "./services/clusterService";

let chain: ChainEntity;
const args = minimist(process.argv.slice(2));

export const executionManager = {

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
                slotsWithNext.push([slots[i], nextSlot - 1]);
            }
        } else if (blockCount > 0) {
            slotsWithNext = await this.recalculateSlots();
        }
        return slotsWithNext;
    },

    async recalculateSlots(): Promise<number[][]> {
        console.log("Continuing indexing " + chain.chain_name + ", recalculating slots...");
        const slotsWithNext = [];
        // we are first getting the orphan blocks (blocks in the db without a parent hash) and then we get the first block with a lower block number
        const orphanBlocks = await blockRepository.getOrphanBlocks(chain.id);
        for (let i = 0; i < orphanBlocks.length; i++) {
            const firstBlockWithLowerNumber = await blockRepository.getFirstBlockWithLowerNumber(orphanBlocks[i].number, chain.id);
            const toNum: number = firstBlockWithLowerNumber === undefined ? 0 : firstBlockWithLowerNumber.number + 1;
            slotsWithNext.push([toNum, orphanBlocks[i].number]);
        }
        return slotsWithNext;
    }
};

// for indexing
clusterService.indexSlots(args.endpoint);