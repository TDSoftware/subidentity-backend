import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { Chain } from "../types/entities/Chain";

class ChainRepository extends MySQLRepository<Chain> {
    get tableName(): string {
        return "chain";
    }

    async findByWsProvider(wsProvider: string): Promise<Chain|undefined> {
        const query = `SELECT * FROM ${this.tableName} WHERE ws_provider=${escape(wsProvider)}`;
        return (await runSelectQuery<Chain>(query))[0];
    }
}

export const chainRepository = new ChainRepository();