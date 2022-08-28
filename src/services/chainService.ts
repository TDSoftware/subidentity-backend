import { chainRepository } from "../repositories/chainRepository";
import { ChainStatusDTO } from "../types/dtos/ChainStatusDTO";
import { chainMapper } from "./mapper/chainMapper";
import { getChainName, getTokenDetails, implementsIdentityPallet, isArchiveNode } from "@npmjs_tdsoftware/subidentity";
import { ChainStatus } from "../types/enums/ChainStatus";
import { Token } from "@npmjs_tdsoftware/subidentity";
import { wsProviderService } from "./wsProviderService";
import { ChainEntity } from "../types/entities/ChainEntity";

export const chainService = {

    async createChain(wsProvider: string): Promise<ChainStatusDTO | undefined> {
        const chainName = await getChainName(wsProvider);
        const existingChain = await chainRepository.findByChainName(chainName);
        if (existingChain) {
            wsProviderService.createWsProvider(existingChain.id, wsProvider);
            return chainMapper.toStatusDTO(existingChain, true);
        }
        const isArchive = await isArchiveNode(wsProvider);
        const implmentsIdentityPallet = await implementsIdentityPallet(wsProvider);
        if (isArchive && implmentsIdentityPallet) {
            const token: Token = await getTokenDetails(wsProvider);
            const chain = {
                chain_name: chainName,
                status: ChainStatus.Unindexed,
                token_symbol: token.symbol,
                token_decimals: token.decimals,
                is_archive_node: isArchive
            };
            const chainEntity = await chainRepository.insert(chain);
            wsProviderService.createWsProvider(chainEntity.id, wsProvider);
            return chainMapper.toStatusDTO(chainEntity, implmentsIdentityPallet);
        } else {
            const chainStatus: ChainStatusDTO = {
                isIndexed: false,
                implementsIdentityPallet: implmentsIdentityPallet,
                isArchiveNode: isArchive,
                chainName: chainName
            };
            return chainStatus;
        }
    },

    async findByWsProvider(wsProvider: string): Promise<ChainStatusDTO | undefined> {
        const chain = await chainRepository.findByWsProvider(wsProvider);
        if (!chain)
            return await this.createChain(wsProvider);
        return chainMapper.toStatusDTO(chain, true);
    },

    async updateChainStatus(id: number, status: ChainStatus): Promise<void> {
        const chain = await chainRepository.getById(id);
        if (!chain) {
            console.log("Could not find the chain with id " + id + " to update it's status to " + status);
            return;
        }
        chain.status = status;
        chainRepository.update(chain);
    },

    async getChainEntityByWsProvider(wsProvider: string): Promise<ChainEntity> {
        const chain = await chainRepository.findByWsProvider(wsProvider);
        if (!chain)
            throw new Error("Could not find chain with given wsProvider");
        return chain;
    }
};