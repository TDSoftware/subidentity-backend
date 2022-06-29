export interface ProposalEntity {
    id: number;
    proposal_index: number;
    chain_id: number;
    method: string;
    section: string;
    status: string;
    type: string;
    proposed_by: number;
    proposed_at: number;
}