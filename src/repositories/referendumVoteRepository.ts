import { ReferendumVoteEntity } from "./../types/entities/ReferendumVoteEntity";
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { ReferendumVoteDTO } from "../types/dtos/ReferendumVoteDTO";

class ReferendumVoteRepository extends MySQLRepository<ReferendumVoteEntity> {
    get tableName(): string {
        return "referendum_vote";
    }

    // get by voter and referendum index and voter
    async getByVoterAndReferendumId(voter: number, referendumId: number): Promise<ReferendumVoteEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.voter = ${voter} AND ${this.tableName}.referendum_id = ${referendumId}`;
        return (await runSelectQuery<ReferendumVoteEntity>(query))[0];
    }

    async getAccountsReferendumVotes(accountAddress: string, chainId: number): Promise<ReferendumVoteDTO[]> {
        const query = `SELECT
            rv.voted_at AS block,
            r.referendum_index AS referendumIndex,
            rv.vote
        FROM
            account a
            JOIN referendum_vote rv ON a.id = rv.voter
            JOIN referendum r ON r.id = rv.referendum_id
        WHERE
            a.address = "${accountAddress}"
            AND a.chain_id = ${chainId};`;
        return await runSelectQuery<ReferendumVoteDTO>(query);
    }

}

export const referendumVoteRepository = new ReferendumVoteRepository();