import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TipEntity } from "../types/entities/TipEntity";

class TipRepository extends MySQLRepository<TipEntity> {
    get tableName(): string {
        return "tip";
    }
}

export const tipRepository = new TipRepository();