import { ApiPromise, WsProvider } from "@polkadot/api";
import { SignedBlock } from "@polkadot/types/interfaces";
import { blockRepository } from "../repositories/blockRepository";
import { ChainEntity } from "../types/entities/ChainEntity";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity"
import { blockMapper } from "./mapper/blockMapper";
import { chainService } from "./chainService";
import { BountyEntity } from "../types/entities/BountyEntity";
import { ExtrinsicMethod } from "../types/enums/ExtrinsicMethod";
import { ExtrinsicSection } from "../types/enums/ExtrinsicSection";
import { BountyMethod } from "../types/enums/BountyMethod";
import { BountyStatus } from "../types/enums/BountyStatus";
import { bountyRepository } from "../repositories/bountyRepository";
import { Exception } from "sass";
import { councilMotionRepository } from "../repositories/councilMotionRepository";
import { testEnvironmentOptions } from "../../jest.config";

let chain: ChainEntity;
let wsProvider: WsProvider;
let api: ApiPromise;

export const indexingService = {

    async readBlock(blockHash: string, to: number): Promise<void> {
        const block = await api.rpc.chain.getBlock(blockHash);
        if (block.block.header.number.toNumber() >= to) indexingService.readBlock(block.block.header.parentHash.toString(), to);
        else {
            console.log(new Date());
            process.exit(0);
        }
        indexingService.parseExtrinsic(block, blockHash)
        //indexingService.parseBlock(block, blockHash);
    },

    async parseBlock(block: SignedBlock, blockHash: string): Promise<void> {
        await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id));
    },

    async indexChain(wsProviderAddress: string, from: number, to: number): Promise<void> {
        console.log("Indexing start: " + new Date());
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });
        const startHash = await api.rpc.chain.getBlockHash(from);
        indexingService.readBlock(startHash.toString(), to);
    },

    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        // getting all extrinsics and all events for a block
        const extrinsics = block.block.extrinsics
        const blockEvents = await api.query.system.events.at(blockHash);

        extrinsics.forEach((ex, index) =>{
            // use index to get specific events for the current extrinsic
            const extrinsicEvents = blockEvents.find(e => e.phase.asApplyExtrinsic.toNumber() == index)?.toHuman()
            const extrinsicMethod = ex.method.method
            const extrinsicSection = ex.method.section

            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.CLOSE) {
                // do sth
            }

            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.PROPOSE) {
                // do sth
            }

            if(extrinsicSection == ExtrinsicSection.BOUNTIES && extrinsicMethod == ExtrinsicMethod.PROPOSEBOUNTY) {
                // do sth
            }

            if(extrinsicSection == ExtrinsicSection.TREASURY && extrinsicMethod == ExtrinsicMethod.PROPOSESPEND) {
                // do sth
            }

            if(extrinsicSection == ExtrinsicSection.TIMESTAMP && extrinsicMethod == ExtrinsicMethod.SET) {
                // do sth
            }

            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.VOTE) {
                // do sth
            }

        })
    }
};