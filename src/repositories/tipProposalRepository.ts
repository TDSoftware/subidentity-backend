import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TipProposalDTO } from "../types/dtos/TipProposalDTO";
import { TipProposalEntity } from "../types/entities/TipProposalEntity";

class TipProposalRepository extends MySQLRepository<TipProposalEntity> {
    get tableName(): string {
        return "tip_proposal";
    }

    async getByMotionHashAndChainId(motionHash: string, chainId: number): Promise<TipProposalEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}" AND ${this.tableName}.chain_id = ${chainId}`;
        return (await runSelectQuery<TipProposalEntity>(query))[0];
    }

    async getTipProposalsByAcountAddress(accountAddress: string, chainId: number): Promise<TipProposalDTO[]> {
        const query = `SELECT
                a2.address AS beneficiary,
                tp.reason,
                tp.proposed_at as block
            FROM
                account a
                JOIN tip_proposal tp ON a.id = tp.finder
                JOIN account a2 ON tp.beneficiary = a2.id
                    AND a2.chain_id = ${chainId}
            WHERE
                a.address = "${accountAddress}"
                AND a.chain_id = ${chainId};`;
        return await runSelectQuery<TipProposalDTO>(query);
    }
}

export const tipProposalRepository = new TipProposalRepository();