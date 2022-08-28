import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { TipDTO } from "../types/dtos/TipDTO";
import { TipEntity } from "../types/entities/TipEntity";

class TipRepository extends MySQLRepository<TipEntity> {
    get tableName(): string {
        return "tip";
    }

    async getAccountsTips(accountAddress: string, chainId: number): Promise<TipDTO[]> {
        const query = `SELECT t.value, t.tipped_at as block, tp.motion_hash as tipProposalHash FROM account a JOIN tip t ON a.id=t.tipper JOIN tip_proposal tp ON tp.id=t.tip_proposal_id WHERE a.address="${accountAddress}" AND a.chain_id=${chainId};`;
        return await runSelectQuery<TipDTO>(query);
    }
}

export const tipRepository = new TipRepository();