import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TipProposalEntity } from '../types/entities/TipProposalEntity';

class TipProposalRepository extends MySQLRepository<TipProposalEntity > {
    get tableName(): string {
        return "tip_proposal";
    }

    async getByMotionHash(motionHash: string): Promise<TipProposalEntity> {
        const query = `SELECT id FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}"`;
        return (await runSelectQuery<TipProposalEntity>(query))[0];
    }
}

export const tipProposalRepository = new TipProposalRepository();