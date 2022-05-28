import { IdentityEntity } from "../entities/IdentityEntity";

export interface IdentitiesResponseDTO extends IdentityEntity{
    chainName: string
}