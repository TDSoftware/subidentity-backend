export interface ReferendumEntity {
    id: number;
    referendum_index: number
    started_at: number;
    ended_at: number;
    proposal_id: number;
    status: string;
    chain_id: number;
    vote_threshold: string;
}