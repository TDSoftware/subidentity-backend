import { IdentityEntity } from "../entities/IdentityEntity";

export interface IdentitiesResponseDTO extends IdentityEntity{
    chain_name: string
}