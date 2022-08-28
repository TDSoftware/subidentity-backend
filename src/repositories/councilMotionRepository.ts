import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { CouncilMotionDTO } from "../types/dtos/CouncilMotionDTO";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";

class CouncilMotionRepository extends MySQLRepository<CouncilMotionEntity> {
    get tableName(): string {
        return "council_motion";
    }

    async getByMotionHash(motionHash: string): Promise<CouncilMotionEntity> {
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.tableName}.motion_hash = "${motionHash}"`;
        return (await runSelectQuery<CouncilMotionEntity>(query))[0];
    }

    async getCouncilMotionsByAccountAddress(address: string, chainId: number): Promise<CouncilMotionDTO[]> {
        const query = `SELECT cm.proposal_index as \`index\`, cm.from_block as block  FROM account a JOIN council_motion cm ON cm.proposed_by=a.id WHERE a.address = "${address}" AND a.chain_id=${chainId};`;
        return await runSelectQuery<CouncilMotionDTO>(query);
    }

}

export const councilMotionRepository = new CouncilMotionRepository();