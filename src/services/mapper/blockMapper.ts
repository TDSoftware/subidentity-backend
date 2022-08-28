import { BlockEntity } from "../../types/entities/BlockEntity";


export const blockMapper = {
    toInsertEntity(blockHash: string, blockNumber: number, chain: number, error: boolean, errorMessage: string): Omit<BlockEntity, "id"> {
        return {
            hash: blockHash,
            number: blockNumber,
            chain_id: chain,
            error: error,
            error_message: errorMessage
        };
    }
};