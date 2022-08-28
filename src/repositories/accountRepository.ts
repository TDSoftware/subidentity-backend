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

    async findByAddressAndChain(address: string, chain: number): Promise<AccountEntity | undefined> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.address="${address}" AND ${this.tableName}.chain_id=${chain}`;
        return (await runSelectQuery<AccountEntity>(query))[0];
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

    async getOrCreateAccount(address: string, chainId: number): Promise<AccountEntity> {
        const account = await this.findByAddressAndChain(address, chainId);
        if (account) {
            return account;
        }
        return await this.insert(<AccountEntity>{chain_id: chainId, address: address});
    }
}

export const accountRepository = new AccountRepository();