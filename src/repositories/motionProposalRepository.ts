import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { MotionProposalEntity } from "../types/entities/MotionProposalEntity";

class MotionProposalRepository extends MySQLRepository<MotionProposalEntity> {
    get tableName(): string {
        return "motion_proposal";
    }
}

export const motionProposalRepository = new MotionProposalRepository();