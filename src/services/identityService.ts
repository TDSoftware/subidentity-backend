import { getIdentity, Identity, Page } from "@npmjs_tdsoftware/subidentity";
import { BasicIdentityInfo } from "@npmjs_tdsoftware/subidentity";
import { identityRepository } from "../repositories/identityRepository";
import { IdentityEntity } from "../types/entities/IdentityEntity";
import { paginationUtil } from "./utils/paginationUtil";
import { u8aToString, hexToU8a } from "@polkadot/util";
import { chainService } from "./chainService";

export const identityService = {
    async findOneByWsProviderAndAccountAddress(wsProvider: string, accountAddress: string): Promise<Identity | undefined> {
        await this.checkWsProvider(wsProvider);
        return await getIdentity(wsProvider, accountAddress);
    },

    async getAllIdentitiesByWsProvider(wsProvider: string, page: number, limit: number): Promise<Page<Identity>> {
        await this.checkWsProvider(wsProvider);
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
        await this.checkWsProvider(wsProvider);
        const items: Identity[] = [];
        const totalItemsCount = await identityRepository.getRowCountForSearchkey(wsProvider, searchKey);
        if (totalItemsCount > 0 && pageNum > 0) {
            const offset = (pageNum - 1) * limit;
            const searchResults = await identityRepository.searchByWsProviderAndKey(wsProvider, searchKey, offset, limit);
            if (searchResults.length > 0) {
                searchResults.forEach(function (value) {
                    const { email, legal, riot, twitter, web, address } = value;
                    let display = value.display;
                    if (display && /^0x/.test(display)) {
                        display = u8aToString(hexToU8a(display));
                    }
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
    },

    async checkWsProvider(wsProvider: string): Promise<void> {
        const chain = await chainService.findByWsProvider(wsProvider);
        if (!chain?.implementsIdentityPallet) throw new Error("400:Chain does not implement the identity pallet.");
        else if (!chain?.isArchiveNode) throw new Error("400:Provided node is not an archive node.");
        else if (!chain?.isIndexed) throw new Error("400:Chain is not indexed yet.");
    }
};