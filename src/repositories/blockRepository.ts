import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { BlockEntity } from "../types/entities/BlockEntity";

class BlockRepository extends MySQLRepository<BlockEntity> {
    get tableName(): string {
        return "block";
    }
}

export const blockRepository = new BlockRepository();