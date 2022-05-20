import { MySQLRepository } from "../lib/MySQLRepository";
import { Account } from "../types/entities/Account";

class AccountRepository extends MySQLRepository<Account> {
    get tableName(): string {
        return "account";
    }
}

export const accountRepository = new AccountRepository();