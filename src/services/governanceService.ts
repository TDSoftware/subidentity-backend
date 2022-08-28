import { AccountActivity } from "@npmjs_tdsoftware/subidentity";
import { councilMotionRepository } from "../repositories/councilMotionRepository";
import { councilMotionVoteRepository } from "../repositories/councilMotionVoteRepository";
import { proposalRepository } from "../repositories/proposalRepository";
import { referendumVoteRepository } from "../repositories/referendumVoteRepository";
import { accountActivityMapper } from "./mapper/accountActivityMapper";

export const governanceService = {
    async getActivityForAccountAddress(accountAddress: string, chainId: number): Promise<AccountActivity[]> {
        const [councilMotions, councilMotionVotes, proposals, referendumVotes] = await Promise.all([
            councilMotionRepository.getCouncilMotionsByAccountAddress(accountAddress, chainId),
            councilMotionVoteRepository.getCouncilMotionVotesByAddressAndChainId(accountAddress, chainId),
            proposalRepository.getAccountsProposals(accountAddress, chainId),
            referendumVoteRepository.getAccountsReferendumVotes(accountAddress, chainId)
        ]);
        return [
            ...accountActivityMapper.councilMotionDTOsToAccountActivities(councilMotions),
            ...accountActivityMapper.councilMotionVotesToAccountActivities(councilMotionVotes),
            ...accountActivityMapper.proposalsToAccountActivities(proposals),
            ...accountActivityMapper.referendumVotesToAccountActivities(referendumVotes)
        ];
    }
};