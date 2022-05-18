import { Balance } from "./BalanceDTO";
import { BasicInfoDTO } from "./BasicInfoDTO";

export interface IdentityResponseDTO {
    chain: string;
    basicInfo: BasicInfoDTO;
    judgements?: string[];
    balance?: Balance
}