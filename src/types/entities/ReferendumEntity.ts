export interface ReferendumEntity {
    id: number;
    started_at: number;
    ended_at: number;
    proposal_id: number;
    status: string;
    vote_threshold: string;
}