import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { BlockEntity } from "../types/entities/BlockEntity";

class BlockRepository extends MySQLRepository<BlockEntity> {
    get tableName(): string {
        return "block";
    }

    async getByBlockHash(blockHash: string): Promise<BlockEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.hash = "${blockHash}" `;
        return (await runSelectQuery<BlockEntity>(query))[0];
    }
}

export const blockRepository = new BlockRepository();