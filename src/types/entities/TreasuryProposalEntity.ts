export interface TreasuryProposalEntity {
    id: number;
    submitter: string;
    beneficiary: string;
    proposedAt: Date;
    value: number;
    status: string;
}