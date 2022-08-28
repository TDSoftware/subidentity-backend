import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionVoteDTO } from "../types/dtos/CouncilMotionVoteDTO";
import { CouncilMotionVoteEntity } from "../types/entities/CouncilMotionVoteEntity";

class CouncilMotionVoteRepository extends MySQLRepository<CouncilMotionVoteEntity> {
    get tableName(): string {
        return "council_motion_vote";
    }

    async getByCouncilMotionIdAndAccountId(councilMotionId: number, accountId: number): Promise<CouncilMotionVoteEntity> {
        const query = `SELECT id FROM ${this.tableName} WHERE ${this.tableName}.council_motion_id = ${councilMotionId} AND ${this.tableName}.account_id = "${accountId}" `;
        return (await runSelectQuery<CouncilMotionVoteEntity>(query))[0];
    }

    async getCouncilMotionVotesByAddressAndChainId(address: string, chainId: number): Promise<CouncilMotionVoteDTO[]> {
        const query = `SELECT
                cmv.block,
                cm.proposal_index as councilMotionIndex,
                cmv.approved
            FROM
                account a
                JOIN council_motion_vote cmv ON cmv.account_id = a.id
                JOIN council_motion cm ON cmv.council_motion_id=cm.id
            WHERE
                a.address="${address}" and a.chain_id=${chainId}`;
        return await runSelectQuery<CouncilMotionVoteDTO>(query);
    }
}

export const councilMotionVoteRepository = new CouncilMotionVoteRepository();