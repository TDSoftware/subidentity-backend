import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { BountyEntity } from "../types/entities/BountyEntity";

class BountyRepository extends MySQLRepository<BountyEntity> {
    get tableName(): string {
        return "bounty";
    }
}

// SELECT COUNT FROM bounty WHERE bounty.id = ?


export const bountyRepository = new BountyRepository();


