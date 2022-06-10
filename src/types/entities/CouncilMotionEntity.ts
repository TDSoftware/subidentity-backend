export interface CouncilMotionEntity {
    id: number;
    motion_hash: string;
    chain_id: number;
    method: string;
    section: string;
    proposed_by: number;
    status: string;
    from_block: number;
    to_block: number;
}