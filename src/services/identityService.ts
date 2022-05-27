import { Identity, Page } from "@npmjs_tdsoftware/subidentity";
import { BasicIdentityInfo } from "@npmjs_tdsoftware/subidentity";
import { identityRepository } from "../repositories/identityRepository";
import { paginationUtil } from "./utils/paginationUtil";

export const identityService = {
    async findOneByWsProviderAndAccountAddress(wsProvider: string, accountAddress: string): Promise<Identity|undefined> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async getAllIdentitiesByWsProvider(wsProvider: string, page: number, limit: number): Promise<Page<Identity>> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async searchIdentitiesByWsProviderAndKey(wsProvider: string, searchKey: string, pageNum: number, limit: number): Promise<Page<Identity>> {
        const items: Identity[] = [];
        const totalItemsCount = await identityRepository.getRowCount(wsProvider, searchKey);
        if(totalItemsCount > 0 && pageNum > 0) {
            const offset = (pageNum - 1) * limit;
            const searchResults = await identityRepository.searchByWsProviderAndKey(wsProvider, searchKey, offset, limit);
            if(searchResults.length > 0) {
                searchResults.forEach(function(value) {
                    const basicInfo: BasicIdentityInfo = value;
                    const chain = value.chainName;
                    const identity : Identity = { chain, basicInfo };
                    items.push(identity);
                });
            }
        }
        return paginationUtil.paginate(items, pageNum, limit, totalItemsCount);
    }
};