import { IdentityEntity } from "../../types/entities/IdentityEntity"
import { IdentitiesResponseDTO } from "../../types/dtos/IdentitiesResponseDTO";


export const identityRepository = {

    getRowCountForSearchkey(): number {
        return 1;
    },

    searchByWsProviderAndKey(): IdentitiesResponseDTO[] {
        return [
            {
                id: 1,
                account_id: 1,
                active: true,
                display: "fake-display",
                legal: "fake-name",
                address: "ABCDEFGHI12345678",
                riot: "fake-riot",
                twitter: "fake-twitter",
                web: "fake-web",
                email: "fake-email",
                chain_name: "fake-chain-name"
            }

        ]
    },

    getRowCountForAllByWsProvider(): number {
        return 1;
    },

    findAllByWsProvider(): IdentitiesResponseDTO[] {
        return this.searchByWsProviderAndKey();
    },

    findAllByChainId(): IdentityEntity[] | undefined {
        return [
            {
                id: 1,
                account_id: 1,
                active: true,
                display: "fake-display",
                legal: "fake-name",
                address: "ABCDEFGHI12345678",
                riot: "fake-riot",
                twitter: "fake-twitter",
                web: "fake-web",
                email: "fake-email"
            }

        ]
    },
}
