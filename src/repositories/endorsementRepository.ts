import { EndorsementEntity } from './../types/entities/EndorsementEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class EndorsementRepository extends MySQLRepository<EndorsementEntity> {
    get tableName(): string {
        return "endorsement";
    }

    // function to get Endorsement by proposal_id and endorser_id
    async getByProposalIdAndEndorser(proposal_id: number, endorser: number): Promise<EndorsementEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.proposal_id = ${proposal_id} AND ${this.tableName}.endorser = ${endorser}`;
        return (await runSelectQuery<EndorsementEntity>(query))[0];
    }

}

export const endorsementRepository = new EndorsementRepository();