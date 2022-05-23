import { ChainStatus } from "../enums/ChainStatus";

export interface ChainDTO {
    chainName: string;
    wsProvider: string;
    status: ChainStatus;
    tokenSymbol?: string;
    tokenDecimals?: number;
    isArchiveNode: boolean;
}