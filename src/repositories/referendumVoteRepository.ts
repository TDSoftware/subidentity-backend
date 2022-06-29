import { ReferendumVoteEntity } from './../types/entities/ReferendumVoteEntity';
import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";

class ReferendumVoteRepository extends MySQLRepository<ReferendumVoteEntity> {
    get tableName(): string {
        return "referendum_vote";
    }

}

export const referendumVoteRepository = new ReferendumVoteRepository();