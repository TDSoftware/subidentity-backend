import { runQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { LogEntity } from "../types/entities/LogEntity";

class LogRepository extends MySQLRepository<LogEntity> {
    get tableName(): string {
        return "log";
    }
}

export const logRepository = new LogRepository();