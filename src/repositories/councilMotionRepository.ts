import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";

class CouncilMotionRepository extends MySQLRepository<CouncilMotionEntity> {
    get tableName(): string {
        return "council_motion";
    }

    async getByMotionHash(motionHash: string): Promise<CouncilMotionEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}"`;
        return (await runSelectQuery<CouncilMotionEntity>(query))[0];
    }

}

export const councilMotionRepository = new CouncilMotionRepository();