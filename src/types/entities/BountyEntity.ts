export interface BountyEntity {
    id: number;
    council_motion_id: number;
    bounty_id: number
    status: string;
    value: number;
    description: string;
    proposedAt: number;
    proposedBy: string;
}