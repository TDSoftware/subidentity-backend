import { ApiPromise, WsProvider } from "@polkadot/api";
import { ChainEntity } from "../types/entities/ChainEntity";
import { Header } from "@polkadot/types/interfaces";
import { chainService } from "./chainService";
import { indexingService } from "./indexingService";

let chain: ChainEntity;
let wsProvider: WsProvider;
let api: ApiPromise;
let blockNumbers: number[] = [];
const batchCount = 150;
const blockOverhead = 40;


export const listenerService = {
    async parseNewBlocks(wsProviderAddress: string): Promise<void> {
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });

        await api.rpc.chain.subscribeAllHeads(async (header: Header) => {
            const blockNumber = header.number.toNumber();
            if (!blockNumbers.find((blockNum: number) => blockNum === blockNumber)) {
                blockNumbers.push(blockNumber);
                console.log("New Block: " + blockNumber + " found! " + (batchCount - blockNumbers.length) + " blocks left until batch will be indexed.");
            }

            // we do it like this because the blocks we get are not necessarily finalized
            // so we cut out a certain amount of blocks from the end of the array, can probably be handled better
            // adjust blockOverhead according to the time it takes for a block to finalize
            if (blockNumbers.length === batchCount) {
                const blockNumbersRest = blockNumbers.slice(-(blockOverhead));
                blockNumbers = blockNumbers.slice(0, -(blockOverhead));
                try {
                    await indexingService.indexChain(wsProviderAddress, blockNumbers[blockNumbers.length - 1], blockNumbers[0]);
                } catch (e) {
                    console.log("[listenerService] Error while indexing new blocks: " + e);
                }
                blockNumbers = blockNumbersRest;
            }
        });
    }
};