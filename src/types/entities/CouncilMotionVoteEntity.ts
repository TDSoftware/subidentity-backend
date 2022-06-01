export interface CouncilMotionVoteEntity {
    id: number;
    council_motion_id: number;
    block: number;
    voteUp: boolean;
    accountId: string;
}