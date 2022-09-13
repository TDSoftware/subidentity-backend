import { ProposalEntity } from "../types/entities/ProposalEntity";
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { ProposalDTO } from "../types/dtos/ProposalDTO";

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

    async getAccountsProposals(accountAddress: string, chainId: number): Promise<ProposalDTO[]> {
        const query = `SELECT
            IFNULL(p.proposal_index, -1) AS proposalIndex,
            IFNULL(b.number, -1) AS block,
            p.\`type\`,
            IFNULL(r.referendum_index, -1) as referendumIndex
        FROM
            account a
            JOIN proposal p ON p.proposed_by = a.id
            LEFT JOIN referendum r ON r.proposal_id=p.id
            LEFT JOIN block b ON p.proposed_at=b.id
        WHERE
            a.address = "${accountAddress}"
            AND a.chain_id = ${chainId};`;
        return await runSelectQuery<ProposalDTO>(query);
    }
}

export const proposalRepository = new ProposalRepository();