import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { Identity } from "../types/entities/Identity";
import { wsProviderRepository } from "../repositories/wsProviderRepository";
import { accountRepository } from "../repositories/accountRepository";
import { chainRepository } from "../repositories/chainRepository";

class IdentityRepository extends MySQLRepository<Identity> {
    get tableName(): string {
        return "identity";
    }

    async getRowCount(wsProvider: string, searchKey: string): Promise<number> {
        const query = `SELECT COUNT(*)
                        FROM ${this.tableName}
                        INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                        INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                        INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                        WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                        AND ${this.tableName}.display LIKE "%${searchKey}%" 
                            OR ${this.tableName}.legal LIKE "%${searchKey}%"
                            OR ${this.tableName}.address LIKE "%${searchKey}%"
                            OR ${this.tableName}.riot LIKE "%${searchKey}%"
                            OR ${this.tableName}.twitter LIKE "%${searchKey}%"
                            OR ${this.tableName}.web LIKE "%${searchKey}%"
                            OR ${this.tableName}.email LIKE "%${searchKey}%"
                        ORDER BY ${this.tableName}.id`;
        const queryResult = (await runSelectQuery<number>(query))[0];
        const resultJson = Object.values(JSON.parse(JSON.stringify(queryResult)));
        return resultJson[0] as number;
    }

    async searchByWsProviderAndKey(wsProvider: string, searchKey: string, offset: number, limit: number): Promise<Identity[]> {
        const query = `SELECT 
                            ${chainRepository.tableName}.chain_name,
                            ${this.tableName}.display, 
                            ${this.tableName}.legal, 
                            ${this.tableName}.address,
                            ${this.tableName}.riot,
                            ${this.tableName}.twitter,
                            ${this.tableName}.web,
                            ${this.tableName}.email
                       FROM ${this.tableName}
                       INNER JOIN ${accountRepository.tableName} ON ${this.tableName}.account_id = ${accountRepository.tableName}.id 
                       INNER JOIN ${chainRepository.tableName} ON ${accountRepository.tableName}.chain_id = ${chainRepository.tableName}.id
                       INNER JOIN ${wsProviderRepository.tableName} ON ${chainRepository.tableName}.id = ${wsProviderRepository.tableName}.chain_id
                       WHERE ${wsProviderRepository.tableName}.address=${escape(wsProvider)}
                       AND ${this.tableName}.display LIKE "%${searchKey}%" 
                            OR ${this.tableName}.legal LIKE "%${searchKey}%"
                            OR ${this.tableName}.address LIKE "%${searchKey}%"
                            OR ${this.tableName}.riot LIKE "%${searchKey}%"
                            OR ${this.tableName}.twitter LIKE "%${searchKey}%"
                            OR ${this.tableName}.web LIKE "%${searchKey}%"
                            OR ${this.tableName}.email LIKE "%${searchKey}%"
                        ORDER BY ${this.tableName}.id
                        LIMIT ${escape(offset)},${escape(limit)}`;
        return (await runSelectQuery<Identity>(query));
    }
}

export const identityRepository = new IdentityRepository();