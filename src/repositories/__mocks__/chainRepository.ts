import { ChainEntity } from "../../types/entities/ChainEntity";
import { ChainStatus } from "../../types/enums/ChainStatus";

export const chainRepository = {
    findByWsProvider(): ChainEntity {
        return {
            id: 1,
            chain_name: "fake-chain-name",
            status: ChainStatus.Indexed,
            token_symbol: "KSM",
            token_decimals: 12,
            is_archive_node: true,
            created_at: new Date(),
            modified_at: new Date()
        };
    }
};