export interface BlockEntity {
    id: number;
    hash: string;
    number: number;
    chain_id: number;
    error: boolean;
    error_message: string;
}