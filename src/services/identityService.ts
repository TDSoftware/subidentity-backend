import { Identity, Page } from "@npmjs_tdsoftware/subidentity";

export const identityService = {
    async findOneByWsProviderAndAccountAddress(wsProvider: string, accountAddress: string): Promise<Identity|undefined> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async getAllIdentitiesByWsProvider(wsProvider: string, page: number, limit: number): Promise<Page<Identity>> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async searchIdentitiesByWsProviderAndKey(wsProvider: string, searchKey: string, page: number, limit: number): Promise<Page<Identity>> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    }
};