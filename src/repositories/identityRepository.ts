import { MySQLRepository } from "../lib/MySQLRepository";
import { Identity } from "../types/entities/Identity";

class IdentityRepository extends MySQLRepository<Identity> {
    get tableName(): string {
        return "identity";
    }
}

export const identityRepository = new IdentityRepository();