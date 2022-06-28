export interface TipProposalEntity{
    id: number;
    motion_hash: string;
    chain_id: number;
    reason: string;
    value: number;
    beneficiary: number;
    finder: number;
    status: string;
    proposed_at: number;
}