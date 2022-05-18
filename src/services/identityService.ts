import { IdentityResponseDTO } from "../types/dtos/IdentityResponseDTO";

export const identityService = {
    async findOneByWsProviderAndAccountAddress(wsProvider: string, accountAddress: string): Promise<IdentityResponseDTO|undefined> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async getAllIdentitiesByWsProvider(wsProvider: string, page: number, limit: number): Promise<IdentityResponseDTO[]> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    },

    async searchIdentitiesByWsProviderAndKey(wsProvider: string, searchKey: string, page: number, limit: number): Promise<IdentityResponseDTO[]> {
        //TODO:Implementation
        throw new Error("501:Not yet implemented!");
    }
};