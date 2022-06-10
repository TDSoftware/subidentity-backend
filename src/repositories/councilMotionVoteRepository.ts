import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionVoteEntity } from "../types/entities/CouncilMotionVoteEntity";

class CouncilMotionVoteRepository extends MySQLRepository<CouncilMotionVoteEntity> {
    get tableName(): string {
        return "council_motion_vote";
    }

    async getByCouncilMotionIdAndAccountId(councilMotionId: number, accountId: number): Promise<CouncilMotionVoteEntity[]> {
        const query = `SELECT id FROM ${this.tableName} WHERE ${this.tableName}.council_motion_id = ${councilMotionId} AND ${this.tableName}.account_id = "${accountId}" `;
        return (await runSelectQuery<CouncilMotionVoteEntity>(query));
    }
}

export const councilMotionVoteRepository = new CouncilMotionVoteRepository();