import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CounciltermEntity } from "../types/entities/CounciltermEntity";

class CounciltermRepository extends MySQLRepository<CounciltermEntity> {
    get tableName(): string {
        return "councilterm";
    }
}

export const counciltermRepository = new CounciltermRepository();