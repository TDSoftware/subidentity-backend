import { CouncilMotionEntity } from "../../types/entities/CouncilMotionEntity";


export const councilMotionMapper = {
    toInsertEntity(motionHash: string, method: string, section: string, proposedBy: number, status: string, fromBlock: number, toBlock: number): Omit<CouncilMotionEntity, "id"> {
        return {
            motion_hash: motionHash,
            method: method,
            section: section,
            proposed_by: proposedBy,
            status: status,
            from_block: fromBlock,
            to_block: toBlock
        };
    }
};
