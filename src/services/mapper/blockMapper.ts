import { BlockEntity } from "../../types/entities/BlockEntity";


export const blockMapper = {
    toInsertEntity(blockHash: string, blockNumber: number, chain: number): Omit<BlockEntity, "id"> {
        return {
            hash: blockHash,
            number: blockNumber,
            chain_id: chain
        };
    }
};