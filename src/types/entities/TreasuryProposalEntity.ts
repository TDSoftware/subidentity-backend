import internal from "stream";

export interface TreasuryProposalEntity {
    id: number;
    council_motion_id: number,
    proposal_id: number,
    proposed_at: number,
    proposed_by: string,
    value: number,
    status: string
}