import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { BountyEntity } from "../types/entities/BountyEntity";

class BountyRepository extends MySQLRepository<BountyEntity> {
    get tableName(): string {
        return "bounty";
    }

    async getByBountyIdAndChainId(bountyId: number, chainId: number): Promise<BountyEntity> {
        const query = `SELECT id FROM ${this.tableName} WHERE ${this.tableName}.bounty_id = ${bountyId} AND ${this.tableName}.chain_id = "${chainId}" `;
        return (await runSelectQuery<BountyEntity>(query))[0];
    }

}

export const bountyRepository = new BountyRepository();


