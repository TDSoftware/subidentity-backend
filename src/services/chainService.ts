import { chainRepository } from "../repositories/chainRepository";
import { ChainStatusDTO } from "../types/dtos/ChainStatusDTO";
import { chainMapper } from "./mapper/chainMapper";
import { getChainName, getTokenDetails, implementsIdentityPallet, isArchiveNode } from "@npmjs_tdsoftware/subidentity";
import { ChainStatus } from "../types/enums/ChainStatus";
import { Token } from "@npmjs_tdsoftware/subidentity";

export const chainService = {

    async createChain(wsProvider: string): Promise<ChainStatusDTO|undefined> {
        const isArchive = await isArchiveNode(wsProvider);
        const implmentsIdentityPallet = await implementsIdentityPallet(wsProvider);
        const chainName = await getChainName(wsProvider);

        if(isArchive && implmentsIdentityPallet) {
            const token: Token = await getTokenDetails(wsProvider);    
            const chain = {
                chain_name: chainName,
                ws_provider: wsProvider,
                status: ChainStatus.Unindexed,
                token_symbol: token.symbol,
                token_decimals: token.decimals,
                is_archive_node: isArchive
            };
            return chainMapper.toStatusDTO(await chainRepository.insert(chain), implmentsIdentityPallet);
        } else {
            const chainStatus:ChainStatusDTO = {
                isIndexed: false,
                implementsIdentityPallet: implmentsIdentityPallet,
                isArchiveNode: isArchive,
                chainName: chainName
            };
            return chainStatus;
        }
    },

    async findByWsProvider(wsProvider: string): Promise<ChainStatusDTO|undefined> {
        const chain = await chainRepository.findByWsProvider(wsProvider);
        if(!chain)
            return await this.createChain(wsProvider);
        return chainMapper.toStatusDTO(chain, true);
    }
};