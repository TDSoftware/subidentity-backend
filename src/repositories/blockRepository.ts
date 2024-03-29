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
        const query = `SELECT EXISTS(SELECT hash FROM ${this.tableName} WHERE ${this.tableName}.hash = "${blockHash}") as exist`;
        const [{exist}] = await runSelectQuery<{exist: number}>(query);
        return exist > 0;
    }

    async getBlockCount(chainId: number): Promise<number> {
        const query = `SELECT COUNT(hash) as amount FROM ${this.tableName} WHERE ${this.tableName}.chain_id = ${chainId}`;
        const [{amount}] = await runSelectQuery<{amount: number}>(query);
        return amount;
    }

    async getOrphanBlocks(chainId: number): Promise<BlockEntity[]> {
        const query = `SELECT * FROM ${this.tableName} AS this_block WHERE this_block.chain_id = ${chainId} AND NOT EXISTS (SELECT * FROM ${this.tableName} WHERE ${this.tableName}.number = this_block.number - 1 LIMIT 1)`;
        return await runSelectQuery<BlockEntity>(query);
    }

    async getOrphanBlocksUnderBlockNumber(blockNumber: number, chainId: number): Promise<BlockEntity[]> {
        const query = `SELECT * FROM ${this.tableName} AS this_block WHERE this_block.chain_id = ${chainId} AND this_block.number < ${blockNumber} AND NOT EXISTS (SELECT * FROM ${this.tableName} WHERE ${this.tableName}.number = this_block.number - 1 LIMIT 1)`;
        return await runSelectQuery<BlockEntity>(query);
    }

    async getFirstBlockWithLowerNumber(blockNumber: number, chainId: number): Promise<BlockEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.chain_id = ${chainId} AND ${this.tableName}.number < ${blockNumber} ORDER BY ${this.tableName}.number DESC LIMIT 1`;
        return (await runSelectQuery<BlockEntity>(query))[0];
    }

    async hasHigherBlockNumber(firstBlockId: number, secondBlockId: number): Promise<boolean> {
        const firstQuery = `SELECT number FROM ${this.tableName} WHERE ${this.tableName}.id = ${firstBlockId}`;
        const secondQuery = `SELECT number FROM ${this.tableName} WHERE ${this.tableName}.id = ${secondBlockId}`;
        return (await runSelectQuery<number>(firstQuery))[0] > (await runSelectQuery<number>(secondQuery))[0];
    }

}

export const blockRepository = new BlockRepository();