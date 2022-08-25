import { ProposalEntity } from "../types/entities/ProposalEntity";
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ProposalRepository extends MySQLRepository<ProposalEntity> {
    get tableName(): string {
        return "proposal";
    }

    async getByProposalIndexAndChainIdAndType(proposalIndex: number, chainId: number, type: string): Promise<ProposalEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.proposal_index = ${proposalIndex} AND ${this.tableName}.chain_id = ${chainId} AND ${this.tableName}.type = "${type}"`;
        return (await runSelectQuery<ProposalEntity>(query))[0];
    }

    async getByMotionHashAndChainId(motionHash: string, chainId: number): Promise<ProposalEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}" AND ${this.tableName}.chain_id = ${chainId}`;
        return (await runSelectQuery<ProposalEntity>(query))[0];
    }
}

export const proposalRepository = new ProposalRepository();