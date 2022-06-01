import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { ChainEntity } from "../types/entities/ChainEntity";
import { ChainsWsProvider } from "../types/dtos/ChainsWsProvider";
import { wsProviderRepository } from "../repositories/wsProviderRepository";

class ChainRepository extends MySQLRepository<ChainEntity> {
    get tableName(): string {
        return "chain";
    }

    async findByWsProvider(wsProvider: string): Promise<ChainEntity | undefined> {
        const query = `SELECT ${this.tableName}.chain_name, ${this.tableName}.status, ${this.tableName}.is_archive_node
                       FROM ${this.tableName} 
                       INNER JOIN ${wsProviderRepository.tableName} ON ${this.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                       WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}`;
        return (await runSelectQuery<ChainEntity>(query))[0];
    }


    async getAllWithFirstWsProvider(): Promise<ChainsWsProvider[]> {
        const query =
            `SELECT DISTINCT
            c.id,
            FIRST_VALUE(ws.address) OVER ( PARTITION BY c.id ORDER BY ws.id ) as ws_provider
        FROM ${this.tableName} AS c
        INNER JOIN ${wsProviderRepository.tableName} AS ws ON ws.chain_id = c.id`;
        return (await runSelectQuery<{ id: number, ws_provider: string }>(query));
    }
}

export const chainRepository = new ChainRepository();