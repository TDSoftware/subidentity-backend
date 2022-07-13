import { ReferendumVoteEntity } from './../types/entities/ReferendumVoteEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ReferendumVoteRepository extends MySQLRepository<ReferendumVoteEntity> {
    get tableName(): string {
        return "referendum_vote";
    }

    // get by voter and referendum index and voter
    async getByVoterAndReferendumIndexAndChainId(voter: number, referendumIndex: number, chainId: number): Promise<ReferendumVoteEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.voter = ${voter} AND ${this.tableName}.referendum_index = ${referendumIndex} AND ${this.tableName}.chain_id = ${chainId}`;
        return (await runSelectQuery<ReferendumVoteEntity>(query))[0];
    }

}

export const referendumVoteRepository = new ReferendumVoteRepository();