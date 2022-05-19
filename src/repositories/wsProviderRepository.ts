import { MySQLRepository } from "../lib/MySQLRepository";
import { WsProvider } from "../types/entities/WsProvider";

class WsProviderRepository extends MySQLRepository<WsProvider> {
    get tableName(): string {
        return "ws_provider";
    }
}

export const wsProviderRepository = new WsProviderRepository();