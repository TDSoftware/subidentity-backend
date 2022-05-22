
import { chainRepository } from "../repositories/chainRepository";
import { identityRepository } from "../repositories/identityRepository";
import { accountRepository } from "../repositories/accountRepository";
import { getIdentities } from "@npmjs_tdsoftware/subidentity";
import { ChainsWsProvider } from "../types/dtos/ChainsWsProvider";


export const schedulerService = {
    async fetchIdentities(): Promise<void>{
        console.log("fetchIdentities");
        const chains: ChainsWsProvider[] = await chainRepository.getAllWithFirstWsProvider();
        let identities;
        console.log(chains);
        chains.forEach( async (chain: ChainsWsProvider) => {
            identities = await getIdentities(chain.ws_provider,1,9999);
            await accountRepository.insertOrUpdateAccountsOfIdentities(
                identities.items, chain.id
            );
            identityRepository.insertOrUpdateAll(
                identities.items, chain.id
            );
            //TODO: get and save judgements
        });
    }
};