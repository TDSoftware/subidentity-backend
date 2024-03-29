export interface ProposalEntity {
    id: number;
    proposal_index: number;
    motion_hash: string;
    chain_id: number;
    status: string;
    type: string;
    proposed_by: number;
    proposed_at: number;
    modified_at: number;
}