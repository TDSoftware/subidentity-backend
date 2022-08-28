export interface ReferendumVoteEntity {
    id: number;
    referendum_id: number;
    voter: number;
    voted_at: number;
    locked_value: number;
    conviction: number;
    vote: boolean;
}