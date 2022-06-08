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
import { MotionProposalEntity } from "../types/entities/MotionProposalEntity";
import { Exception } from "sass";
import { motionProposalRepository } from "../repositories/motionProposalRepository";
import { councilMotionRepository } from "../repositories/councilMotionRepository";

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
        indexingService.parseBlock(block, blockHash);
    },

    async parseBlock(block: SignedBlock, blockHash: string): Promise<void> {
        indexingService.readExtrinsics(blockHash)
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

    async readExtrinsics(blockhash: string): Promise<void> {
        const currentBlock = await api.rpc.chain.getBlock(blockhash)

        indexingService.readCouncilMotionData(currentBlock)
    },

    //TODO focus on performance :D
    // * * Motion Proposal should be created before Council Motion
    // check if proposal for council motion already exists
    // first create proposal object/ bounty/ treasury proposal
    //TODO einmal durchgehen

    
    async readCouncilMotionData(block: SignedBlock): Promise<void> {
        block.block.extrinsics.forEach((extrinsic) => {
            if(extrinsic.method.section == ExtrinsicSection.COUNCIL && extrinsic.method.method == ExtrinsicMethod.CLOSE){
                            
                var proposalSection = extrinsic.method.args.proposal.section

                if(proposalSection.toString() != ExtrinsicSection.BOUNTY || ExtrinsicSection.TREASURY) { 

                    // get proposal hash and check if proposal motion already exist
                    var councilMotionEntry: CouncilMotionEntity = <CouncilMotionEntity>{}
                    var motionProposal: MotionProposalEntity = <MotionProposalEntity>{}
                    councilMotionEntry.toBlock == block.block.header.number.toNumber()

                    motionProposal.proposal_hash = extrinsic.method.args.proposalHash

                    var savedProposal = motionProposalRepository.insert(motionProposal)
                    savedProposal.then( (sp) =>{
                        councilMotionEntry.proposal_id = sp.id
                    })
                    councilMotionEntry.proposal_type = "haha"
                    councilMotionRepository.insert(councilMotionEntry)

                } else {
                    switch(proposalSection) {
                        case ExtrinsicSection.BOUNTY: {
                            break;
                        }
                        case ExtrinsicSection.TREASURY: {
                            break;
                        }
                    }
                }
            }
        })
    },

    async readBounty(block: SignedBlock): Promise<void> {
        block.block.extrinsics.forEach(async (extrinsic) => {
            let allBounties = await bountyRepository.getAll()

            allBounties.find(e => e.id == extrinsic.method.args.bounty_id)

            if(extrinsic.method.section == ExtrinsicSection.BOUNTY){
                switch(extrinsic.method.method){
                    case BountyMethod.CLAIMBOUNTY: {
                        if(allBounties.find(e => e.id == extrinsic.method.args.bounty_id) == null){
                            let bounty: BountyEntity = <BountyEntity>{}
                            bounty.id = extrinsic.method.args.bounty_id
                            bounty.status = BountyStatus.CLAIMED
                            break;
                        } else {

                        }
                    }
                    case BountyMethod.PROPOSEBOUNTY: {
                        var thisBounty = allBounties.find(e => e.id == extrinsic.method.args.bounty_id)
                        if (thisBounty != null){
                            thisBounty.createdAt = block.block.header.number.toNumber()
                            bountyRepository.update(thisBounty)
                        } else {
                            let bounty: BountyEntity = <BountyEntity>{}
                            bounty.id = extrinsic.method.args.bounty_id
                            bounty.status = BountyStatus.PROPOSED
                            break;
                        }
                    }
                }
            }
        })
    }
 
};