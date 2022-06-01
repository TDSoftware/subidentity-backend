export interface BountyEntity {
    id: number;
    status: string;
    value: number;
    createdAt: Date;
    description: string;
    proposer: string;
    curator: string;
}