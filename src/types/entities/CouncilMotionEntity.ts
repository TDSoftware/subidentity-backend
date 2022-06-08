export interface CouncilMotionEntity {
    id: number;
    motion_hash: string;
    method: string;
    section: string;
    proposed_by: string;
    from_block: number;
    to_block: number;
}