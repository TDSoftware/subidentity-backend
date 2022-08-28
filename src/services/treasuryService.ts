import { AccountActivity } from "@npmjs_tdsoftware/subidentity";
import { tipProposalRepository } from "../repositories/tipProposalRepository";
import { tipRepository } from "../repositories/tipRepository";
import { accountActivityMapper } from "./mapper/accountActivityMapper";

export const treasuryService = {

    async getActivityForAccountAddress(accountAddress: string, chainId: number): Promise<AccountActivity[]> {
        const tips = await tipRepository.getAccountsTips(accountAddress, chainId);
        const proposals = await tipProposalRepository.getTipProposalsByAcountAddress(accountAddress, chainId);
        return [
            ...accountActivityMapper.tipsToAccountActivities(tips),
            ...accountActivityMapper.tipProposalsToAccountActivities(proposals)
        ];
    }

};