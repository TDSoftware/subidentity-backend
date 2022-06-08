export interface CouncilMotionVoteEntity {
    id: number;
    council_motion_id: number;
    block: number;
    approved: boolean;
    account_id: string;
}