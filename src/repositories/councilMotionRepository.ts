import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";

class CouncilMotionRepository extends MySQLRepository<CouncilMotionEntity> {
    get tableName(): string {
        return "council_motion";
    }
}

export const councilMotionRepository = new CouncilMotionRepository();