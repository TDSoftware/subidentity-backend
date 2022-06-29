import { ProposalEntity } from '../types/entities/ProposalEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ProposalRepository extends MySQLRepository<ProposalEntity> {
    get tableName(): string {
        return "proposal";
    }

}

export const proposalRepository = new ProposalRepository();