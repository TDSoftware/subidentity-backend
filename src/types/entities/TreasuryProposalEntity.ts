export interface TreasuryProposalEntity {
    id: number;
    council_motion_id: number,
    chain_id: number,
    proposal_id: number,
    proposed_at: number,
    proposed_by: number,
    beneficiary: number;
    value: number
    status: string
    modified_at: number;
}