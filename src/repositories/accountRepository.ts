import { runSelectQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { AccountEntity } from "../types/entities/AccountEntity";
import { Identity } from "@npmjs_tdsoftware/subidentity";

class AccountRepository extends MySQLRepository<AccountEntity> {
    get tableName(): string {
        return "account";
    }

    async findAllByChainId(chain_id: number): Promise<AccountEntity[] | undefined> {
        const query = `SELECT *
                       FROM ${this.tableName} 
                       WHERE ${this.tableName}.chain_id=${chain_id}`;
        return (await runSelectQuery<AccountEntity>(query));
    }

    async findByAddress(address: string): Promise<AccountEntity[]> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.address = "${address}" `;
        return (await runSelectQuery<AccountEntity>(query));
    }

    async insertOrUpdateAccountsOfIdentities(identities: Identity[], chainId: number): Promise<QueryResult> {
        const data = [identities.map((identity: Identity) => [identity.basicInfo.address, chainId])];
        const query = `INSERT IGNORE ${accountRepository.tableName}(
                            address,
                            chain_id
                        )
                       VALUES ?;`;
        return await runInsertQuery(query, data);
    }
}

export const accountRepository = new AccountRepository();