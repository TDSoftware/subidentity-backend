export interface BountyEntity {
    id: number;
    council_motion_id: number;
    chain_id: number;
    bounty_id: number
    status: string;
    value: number;
    description: string;
    proposed_at: number;
    proposed_by: number;
    modified_at: number;
}