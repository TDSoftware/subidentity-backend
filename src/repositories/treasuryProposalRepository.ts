import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TreasuryProposalEntity } from "../types/entities/TreasuryProposalEntity";

class TreasuryProposalRepository extends MySQLRepository<TreasuryProposalEntity> {
    get tableName(): string {
        return "treasury_proposal";
    }

    async getByProposalIdAndChainId(proposalId: number, chainId: number): Promise<TreasuryProposalEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.proposal_id = ${proposalId} AND ${this.tableName}.chain_id = "${chainId}" `;
        return (await runSelectQuery<TreasuryProposalEntity>(query))[0];
    }
}

export const treasureProposalRepository = new TreasuryProposalRepository();