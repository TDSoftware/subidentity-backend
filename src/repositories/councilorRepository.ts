import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilorEntity } from "../types/entities/CouncilorEntity";

class CouncilorRepository extends MySQLRepository<CouncilorEntity> {
    get tableName(): string {
        return "councilor";
    }
}

export const councilorRepository = new CouncilorRepository();