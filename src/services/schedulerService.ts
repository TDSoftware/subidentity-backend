
import { chainRepository } from "../repositories/chainRepository";
import { identityRepository } from "../repositories/identityRepository";
import { accountRepository } from "../repositories/accountRepository";
import { getCompleteIdentities } from "@npmjs_tdsoftware/subidentity";
import { ChainsWsProvider } from "../types/dtos/ChainsWsProvider";
import { judgementRepository } from "../repositories/judgementRepository";
import { identityService } from "./identityService";
import { ChainStatus } from "../types/enums/ChainStatus";
import { chainService } from "./chainService";


export const schedulerService = {
    async fetchIdentities(): Promise<void> {
        const chains: ChainsWsProvider[] = await chainRepository.getAllWithFirstWsProvider();
        chains.forEach(async (chain: ChainsWsProvider) => {
            try {
                let identities = await getCompleteIdentities(chain.ws_provider);
                await accountRepository.insertOrUpdateAccountsOfIdentities(
                    identities, chain.id
                );
                await identityRepository.insertOrUpdateAll(
                    identities, chain.id
                );
                identityService.deactivateIdentities(identities, chain.id);
                judgementRepository.deleteAllByChainId(chain.id);
                judgementRepository.insertAllFromIdentities(identities, chain.id);
                if (chain.status !== ChainStatus.Indexed) await chainService.updateChainStatus(chain.id, ChainStatus.Indexed);
            } catch (error) {
                console.log("Could not fetch identities scheduled for " + chain.ws_provider);
                if (error instanceof Error) console.log(error.message);
            }
        });
    }
};