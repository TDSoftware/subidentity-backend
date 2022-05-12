import { Chain } from "../../types/entities/Chain";
import { ChainDTO } from "../../types/dtos/ChainDTO";
import { ChainStatus } from "../../types/enums/ChainStatus";
import { ChainStatusDTO } from "../../types/dtos/ChainStatusDTO";

export const chainMapper = {

    async toStatusDTO(chain: Chain, implementsIdentityPallet: boolean): Promise<ChainStatusDTO> {
        let chainIndexed = false;
        if(chain.status == ChainStatus.Indexed)
            chainIndexed = true;

        const chainStatus: ChainStatusDTO = {
            isIndexed : chainIndexed,
            isArchiveNode: Boolean(chain.is_archive_node),
            implementsIdentityPallet : implementsIdentityPallet,
            chainName: chain.chain_name
        };
        return chainStatus;
    },

    toInsertEntity(chainDTO: ChainDTO): Omit<Chain, "id" | "created_at" | "modified_at"> {
        return {
            chain_name: chainDTO.chainName,
            ws_provider: chainDTO.wsProvider,
            status: chainDTO.status,
            token_symbol: chainDTO.tokenSymbol,
            token_decimals: chainDTO.tokenDecimals,
            is_archive_node: chainDTO.isArchiveNode
        };
    }
};