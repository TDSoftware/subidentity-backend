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
    
    async existsByBlockHash(blockHash: string): Promise<boolean> {
        const query = `SELECT COUNT(*) as amount FROM ${this.tableName} WHERE ${this.tableName}.hash = "${blockHash}"`;
        const [{amount}] = await runSelectQuery<{amount: number}>(query);
        return amount > 0;
    }

    // select all blocks where parent block (block with block number - 1) does not exists
    async getMissingParentBlocks(): Promise<BlockEntity[]> {
        const query = `SELECT * FROM ${this.tableName} WHERE NOT EXISTS (SELECT * FROM ${this.tableName} WHERE ${this.tableName}.number = ${this.tableName}.number - 1)`;
        return await runSelectQuery<BlockEntity>(query);
    }


}

export const blockRepository = new BlockRepository();