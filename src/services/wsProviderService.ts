import { wsProviderRepository } from "../repositories/wsProviderRepository";

export const wsProviderService = {
    
    async createWsProvider(chainId: number, wsProviderAddress: string): Promise<void> {
        const wsProvider = {
            chain_id: chainId,
            address: wsProviderAddress
        };
        await wsProviderRepository.insert(wsProvider);
    }
};