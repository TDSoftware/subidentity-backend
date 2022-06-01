import { runQuery, runInsertQuery, QueryResult } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { AccountEntity } from "../types/entities/AccountEntity";
import { Identity } from "@npmjs_tdsoftware/subidentity";
import { identityRepository } from "./identityRepository";
import { IdentityEntity } from "../types/entities/IdentityEntity";

class JudgementRepository extends MySQLRepository<AccountEntity> {
    get tableName(): string {
        return "judgement";
    }

    async deleteAllByChainId(chain_id: number): Promise<void> {
        const query = `DELETE FROM ${this.tableName} 
                       WHERE ${this.tableName}.chain_id=${chain_id}`;
        return (await runQuery(query));
    }

    async insertAllFromIdentities(identities: Identity[], chainId: number): Promise<QueryResult | undefined> {
        const identityEntities = await identityRepository.findAllByChainId(chainId);
        const query = `INSERT INTO ${this.tableName}(
                        identity_id,
                        judgement,
                        chain_id
                    )
                    VALUES ?`;
        const data: object[] = [];
        identities.filter((identity: Identity) => identity.judgements?.length != 0).forEach(async (identity: Identity) => {
            identity.judgements?.forEach(async (judgement: string) => data.push([identityEntities?.find((identitiy: IdentityEntity) => identitiy.address === identity.basicInfo.address)?.id, judgement, chainId]));
        });
        if (data.length === 0) return;
        return (await runInsertQuery(query, [data]));
    }

}
export const judgementRepository = new JudgementRepository();