import { ApiPromise, WsProvider } from "@polkadot/api";
import { ChainEntity } from "../types/entities/ChainEntity";
import { Header } from "@polkadot/types/interfaces";
import { chainService } from "./chainService";
import { indexingService } from "./indexingService";

let chain: ChainEntity;
let wsProvider: WsProvider;
let api: ApiPromise;
let blockHashes: number[] = [];
const batchCount = 150;

export const listenerService = {
    async parseNewBlocks(wsProviderAddress: string): Promise<void> {
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });

        await api.rpc.chain.subscribeAllHeads(async (header: Header) => {
            const blockNumber = header.number.toNumber();
            if(!blockHashes.find((blockNum: number) => blockNum === blockNumber)) {
                blockHashes.push(blockNumber);
                console.log("New Block: " + blockNumber + " found! " + (batchCount - blockHashes.length) + " blocks left until batch will be indexed.");
            }
            // if we have x blocks, we index them
            if(blockHashes.length === batchCount) {
                indexingService.indexChain(wsProviderAddress, blockHashes[blockHashes.length - 1], blockHashes[0]);
                blockHashes = [];
            }
        });
    }
};