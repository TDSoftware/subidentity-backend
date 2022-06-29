import { EndorsementEntity } from './../types/entities/EndorsementEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class EndorsementRepository extends MySQLRepository<EndorsementEntity> {
    get tableName(): string {
        return "endorsement";
    }

}

export const endorsementRepository = new EndorsementRepository();