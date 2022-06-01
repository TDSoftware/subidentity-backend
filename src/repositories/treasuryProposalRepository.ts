import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TreasuryProposalEntity } from "../types/entities/TreasuryProposalEntity";

class TreasuryProposalRepository extends MySQLRepository<TreasuryProposalEntity> {
    get tableName(): string {
        return "treasury_proposal";
    }
}

export const treasureProposalRepository = new TreasuryProposalRepository();