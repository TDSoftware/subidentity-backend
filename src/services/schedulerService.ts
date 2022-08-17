import { ChainStatus } from "../types/enums/ChainStatus";
import { ChainsWsProvider } from "../types/dtos/ChainsWsProvider";
import { accountRepository } from "../repositories/accountRepository";
import { chainRepository } from "../repositories/chainRepository";
import { chainService } from "./chainService";
import { getCompleteIdentities } from "@npmjs_tdsoftware/subidentity";
import { identityRepository } from "../repositories/identityRepository";
import { identityService } from "./identityService";
import { judgementRepository } from "../repositories/judgementRepository";

export const schedulerService = {
    async fetchIdentities(): Promise<void> {
        const chains: ChainsWsProvider[] = await chainRepository.getAllWithFirstWsProvider();
        chains.forEach(async (chain: ChainsWsProvider) => {
            try {
                const identities = await getCompleteIdentities(chain.ws_provider);
                if (identities.length > 0) {
                    await accountRepository.insertOrUpdateAccountsOfIdentities(
                        identities, chain.id
                    );
                    await identityRepository.insertOrUpdateAll(
                        identities, chain.id
                    );
                    judgementRepository.deleteAllByChainId(chain.id);
                    judgementRepository.insertAllFromIdentities(identities, chain.id);
                }
                identityService.deactivateIdentities(identities, chain.id);
                if (chain.status !== ChainStatus.Indexed) await chainService.updateChainStatus(chain.id, ChainStatus.Indexed);
            } catch (error) {
                console.log("Could not fetch identities scheduled for " + chain.ws_provider);
                if (error instanceof Error) console.log(error.message);
            }
        });
    }
};