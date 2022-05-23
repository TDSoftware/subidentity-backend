
import { chainRepository } from "../repositories/chainRepository";
import { identityRepository } from "../repositories/identityRepository";
import { accountRepository } from "../repositories/accountRepository";
import { getCompleteIdentities } from "@npmjs_tdsoftware/subidentity";
import { ChainsWsProvider } from "../types/dtos/ChainsWsProvider";


export const schedulerService = {
    async fetchIdentities(): Promise<void> {
        const chains: ChainsWsProvider[] = await chainRepository.getAllWithFirstWsProvider();
        let identities;
        chains.forEach(async (chain: ChainsWsProvider) => {
            identities = await getCompleteIdentities(chain.ws_provider);
            await accountRepository.insertOrUpdateAccountsOfIdentities(
                identities, chain.id
            );
            identityRepository.insertOrUpdateAll(
                identities, chain.id
            );
            //TODO: get and save judgements
        });
    }
};