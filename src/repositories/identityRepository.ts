import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { wsProviderRepository } from "../repositories/wsProviderRepository";
import { chainRepository } from "../repositories/chainRepository";
import { QueryResult, runInsertQuery } from "../lib/mysqlDatabase";
import { IdentityEntity } from "../types/entities/IdentityEntity";
import { accountRepository } from "../repositories/accountRepository";
import { Identity } from "@npmjs_tdsoftware/subidentity";
import { AccountEntity } from "../types/entities/AccountEntity";
import { IdentitiesResponseDTO } from "../types/dtos/IdentitiesResponseDTO";


class IdentityRepository extends MySQLRepository<IdentityEntity> {
    get tableName(): string {
        return "identity";
    }

    async getRowCountForSearchkey(wsProvider: string, searchKey: string): Promise<number> {
        const query = `SELECT COUNT(*)
                        FROM ${this.tableName}
                        INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                        INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                        INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                        WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                        AND ${this.tableName}.active is true
                        AND (${this.tableName}.display LIKE "%${searchKey}%" 
                            OR ${this.tableName}.legal LIKE "%${searchKey}%"
                            OR ${this.tableName}.address LIKE "%${searchKey}%"
                            OR ${this.tableName}.riot LIKE "%${searchKey}%"
                            OR ${this.tableName}.twitter LIKE "%${searchKey}%"
                            OR ${this.tableName}.web LIKE "%${searchKey}%"
                            OR ${this.tableName}.email LIKE "%${searchKey}%")
                        ORDER BY ${this.tableName}.id`;
        const queryResult = (await runSelectQuery<number>(query))[0];
        const resultJson = Object.values(JSON.parse(JSON.stringify(queryResult)));
        return resultJson[0] as number;
    }

    async searchByWsProviderAndKey(wsProvider: string, searchKey: string, offset: number, limit: number): Promise<IdentitiesResponseDTO[]> {
        const query = `SELECT 
                            ${chainRepository.tableName}.chain_name,
                            ${this.tableName}.* 
                       FROM ${this.tableName}
                       INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                       INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                       INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                       WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                       AND ${this.tableName}.active is true
                       AND (${this.tableName}.display LIKE "%${searchKey}%" 
                            OR ${this.tableName}.legal LIKE "%${searchKey}%"
                            OR ${this.tableName}.address LIKE "%${searchKey}%"
                            OR ${this.tableName}.riot LIKE "%${searchKey}%"
                            OR ${this.tableName}.twitter LIKE "%${searchKey}%"
                            OR ${this.tableName}.web LIKE "%${searchKey}%"
                            OR ${this.tableName}.email LIKE "%${searchKey}%")
                        ORDER BY ${this.tableName}.id
                        LIMIT ${escape(offset)},${escape(limit)}`;
        return (await runSelectQuery<IdentitiesResponseDTO>(query));
    }

    async getRowCountForAllByWsProvider(wsProvider: string): Promise<number> {
        const query = `SELECT COUNT(*)
                        FROM ${this.tableName}
                        INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                        INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                        INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                        WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                        AND ${this.tableName}.active is true
                        ORDER BY ${this.tableName}.id`;
        const queryResult = (await runSelectQuery<number>(query))[0];
        const resultJson = Object.values(JSON.parse(JSON.stringify(queryResult)));
        return resultJson[0] as number;
    }

    async findAllByWsProvider(wsProvider: string, offset: number, limit: number): Promise<IdentitiesResponseDTO[]> {
        const query = `SELECT 
                            ${chainRepository.tableName}.chain_name,
                            ${this.tableName}.* 
                       FROM ${this.tableName}
                       INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                       INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                       INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                       WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                       AND ${this.tableName}.active is true
                        ORDER BY ${this.tableName}.id
                        LIMIT ${escape(offset)},${escape(limit)}`;
        return (await runSelectQuery<IdentitiesResponseDTO>(query));
    }

    async insertOrUpdateAll(identities: Identity[], chainId: number): Promise<QueryResult> {
        const accounts = await accountRepository.findAllByChainId(chainId);
        const query = `INSERT INTO ${this.tableName}(
                        account_id,
                        active,
                        display,
                        legal,
                        address,
                        riot,
                        twitter,
                        web,
                        email
                    )
                    VALUES ? on duplicate key update 
                        active = values(active),
                        display = values(display),
                        address = values(address),
                        riot = values(riot),
                        twitter = values(twitter),
                        web = values(web),
                        email = values(email);`;
        const data = [identities.map((identity: Identity) =>
            [accounts?.find((account: AccountEntity) => account.address === identity.basicInfo.address)?.id, true, identity.basicInfo.display, identity.basicInfo.legal, identity.basicInfo.address, identity.basicInfo.riot, identity.basicInfo.twitter, identity.basicInfo.web, identity.basicInfo.email]
        )];
        return (await runInsertQuery(query, data));
    }

    async findAllByChainId(chain_id: number): Promise<IdentityEntity[] | undefined> {
        const query = `SELECT ${this.tableName}.*
                       FROM ${this.tableName}
                       INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                       WHERE ${accountRepository.tableName}.chain_id=${chain_id}
                       AND ${this.tableName}.active is true`;
        return (await runSelectQuery<IdentityEntity>(query));
    }
}

export const identityRepository = new IdentityRepository();