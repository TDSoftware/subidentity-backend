import { ReferendumEntity } from "./../types/entities/ReferendumEntity";
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ReferendumRepository extends MySQLRepository<ReferendumEntity> {
    get tableName(): string {
        return "referendum";
    }

    // function that gets referendum by referendum index and chain id
    async getByReferendumIndexAndChainId(referendumIndex: number, chainId: number): Promise<ReferendumEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.referendum_index = ${referendumIndex} AND ${this.tableName}.chain_id = ${chainId}`;
        return (await runSelectQuery<ReferendumEntity>(query))[0];
    } 
}

export const referendumRepository = new ReferendumRepository();