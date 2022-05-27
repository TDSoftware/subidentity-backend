import { MySQLRepository } from "../lib/MySQLRepository";
import { WsProviderEntity } from "../types/entities/WsProviderEntity";

class WsProviderRepository extends MySQLRepository<WsProviderEntity> {
    get tableName(): string {
        return "ws_provider";
    }
}

export const wsProviderRepository = new WsProviderRepository();