import { getIdentity, Identity, Page } from "@npmjs_tdsoftware/subidentity";
import { BasicIdentityInfo } from "@npmjs_tdsoftware/subidentity";
import { identityRepository } from "../repositories/identityRepository";
import { IdentityEntity } from "../types/entities/IdentityEntity";
import { paginationUtil } from "./utils/paginationUtil";

export const identityService = {
    async findOneByWsProviderAndAccountAddress(wsProvider: string, accountAddress: string): Promise<Identity | undefined> {
        return await getIdentity(wsProvider, accountAddress);
    },

    async getAllIdentitiesByWsProvider(wsProvider: string, page: number, limit: number): Promise<Page<Identity>> {
        const items: Identity[] = [];
        const totalItemsCount = await identityRepository.getRowCountForAllByWsProvider(wsProvider);
        if (totalItemsCount > 0 && page > 0) {
            const offset = (page - 1) * limit;
            const searchResults = await identityRepository.findAllByWsProvider(wsProvider, offset, limit);
            if (searchResults.length > 0) {
                searchResults.forEach(function (value) {
                    const { display, email, legal, riot, twitter, web, address } = value;
                    const basicInfo: BasicIdentityInfo = { display, email, legal, riot, twitter, web, address };
                    const chain = value.chain_name;
                    const identity: Identity = { chain, basicInfo };
                    items.push(identity);
                });
            }
        }
        return paginationUtil.paginate(items, page, limit, totalItemsCount);
    },

    async searchIdentitiesByWsProviderAndKey(wsProvider: string, searchKey: string, pageNum: number, limit: number): Promise<Page<Identity>> {
        const items: Identity[] = [];
        const totalItemsCount = await identityRepository.getRowCountForSearchkey(wsProvider, searchKey);
        if (totalItemsCount > 0 && pageNum > 0) {
            const offset = (pageNum - 1) * limit;
            const searchResults = await identityRepository.searchByWsProviderAndKey(wsProvider, searchKey, offset, limit);
            if (searchResults.length > 0) {
                searchResults.forEach(function (value) {
                    const { display, email, legal, riot, twitter, web, address } = value;
                    const basicInfo: BasicIdentityInfo = { display, email, legal, riot, twitter, web, address };
                    const chain = value.chain_name;
                    const identity: Identity = { chain, basicInfo };
                    items.push(identity);
                });
            }
        }
        return paginationUtil.paginate(items, pageNum, limit, totalItemsCount);
    },

    async deactivateIdentities(identities: Identity[], chainId: number): Promise<void> {
        const identityEntities = await identityRepository.findAllByChainId(chainId);
        identityEntities?.forEach((identityEntity: IdentityEntity) => {
            if (identities.findIndex((identity: Identity) => identityEntity.address === identity.basicInfo.address) === -1) {
                identityEntity.active = false;
                identityRepository.update(identityEntity);
            }
        });
    }
};