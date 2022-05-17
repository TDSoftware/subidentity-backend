import { Chain } from "../../types/entities/Chain";
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
    }
};