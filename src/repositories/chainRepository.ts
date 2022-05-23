import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { Chain } from "../types/entities/Chain";
import { wsProviderRepository } from "../repositories/wsProviderRepository";

class ChainRepository extends MySQLRepository<Chain> {
    get tableName(): string {
        return "chain";
    }

    async findByWsProvider(wsProvider: string): Promise<Chain|undefined> {
        const query = `SELECT ${this.tableName}.chain_name, ${this.tableName}.status, ${this.tableName}.is_archive_node
                       FROM ${this.tableName} 
                       INNER JOIN ${wsProviderRepository.tableName} ON ${this.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                       WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}`;
        return (await runSelectQuery<Chain>(query))[0];
    }
}

export const chainRepository = new ChainRepository();