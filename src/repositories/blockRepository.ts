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

    async getBlockCount(chainId: number): Promise<number> {
        const query = `SELECT COUNT(*) as amount FROM ${this.tableName} WHERE ${this.tableName}.chain_id = ${chainId}`;
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
        return (await this.getById(firstBlockId)).number > (await this.getById(secondBlockId)).number;
    }

}

export const blockRepository = new BlockRepository();