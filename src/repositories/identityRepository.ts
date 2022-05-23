import { QueryResult, runInsertQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { IdentityEntity } from "../types/entities/IdentityEntity";
import { accountRepository } from "../repositories/accountRepository";
import { Identity } from "@npmjs_tdsoftware/subidentity";

class IdentityRepository extends MySQLRepository<IdentityEntity> {
    get tableName(): string {
        return "identity";
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
        const data = [identities.map((identity) =>
            [accounts?.find(account => account.address === identity.basicInfo.address)?.id, true, identity.basicInfo.display, identity.basicInfo.legal, identity.basicInfo.address, identity.basicInfo.riot, identity.basicInfo.twitter, identity.basicInfo.web, identity.basicInfo.email]
        )];
        return (await runInsertQuery(query, data));
    }

}

export const identityRepository = new IdentityRepository();