import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionVoteEntity } from "../types/entities/CouncilMotionVoteEntity";

class CouncilMotionVoteRepository extends MySQLRepository<CouncilMotionVoteEntity> {
    get tableName(): string {
        return "council_motion_vote";
    }
}

export const councilMotionVoteRepository = new CouncilMotionVoteRepository();