import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TipProposalEntity } from "../types/entities/TipProposalEntity";

class TipProposalRepository extends MySQLRepository<TipProposalEntity > {
    get tableName(): string {
        return "tip_proposal";
    }

    async getByMotionHashAndChainId(motionHash: string, chainId: number): Promise<TipProposalEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}" AND ${this.tableName}.chain_id = ${chainId}`;
        return (await runSelectQuery<TipProposalEntity>(query))[0];
    }
}

export const tipProposalRepository = new TipProposalRepository();