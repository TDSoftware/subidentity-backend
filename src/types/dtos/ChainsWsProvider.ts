import { ChainStatus } from "../enums/ChainStatus";

export interface ChainsWsProvider {
    id: number;
    ws_provider: string;
    status: ChainStatus;
}