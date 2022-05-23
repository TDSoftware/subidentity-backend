import { ChainStatus } from "../enums/ChainStatus";

export interface ChainEntity {
    id: number;
    chain_name: string;
    status: ChainStatus;
    token_symbol?: string;
    token_decimals?: number;
    is_archive_node: boolean
    created_at: Date;
    modified_at: Date;
}