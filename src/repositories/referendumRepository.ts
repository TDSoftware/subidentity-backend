import { ReferendumEntity } from './../types/entities/ReferendumEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ReferendumRepository extends MySQLRepository<ReferendumEntity> {
    get tableName(): string {
        return "referendum";
    }

}

export const referendumRepository = new ReferendumRepository();