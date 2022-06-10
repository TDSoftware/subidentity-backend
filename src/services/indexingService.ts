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
import { bountyRepository } from "../repositories/bountyRepository";
import { councilMotionRepository } from "../repositories/councilMotionRepository";
import { TreasuryProposalEntity } from "../types/entities/TreasuryProposalEntity";
import { councilMotionVoteRepository } from "../repositories/councilMotionVoteRepository";
import { CouncilMotionVoteEntity } from "../types/entities/CouncilMotionVoteEntity";
import { treasureProposalRepository } from "../repositories/treasuryProposalRepository";
import { accountRepository } from "../repositories/accountRepository";
import { AccountEntity } from "../types/entities/AccountEntity";

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
        await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id));
        indexingService.parseExtrinsic(block, blockHash)
    },

    async indexChain(wsProviderAddress: string, from: number, to: number): Promise<void> {
        console.log("Indexing start: " + new Date());
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });
        const startHash = await api.rpc.chain.getBlockHash(from);
        indexingService.readBlock(startHash.toString(), to);
    },

    /*
        TODO: handle proxy calls in general
        this is a work in progress and not fully functional
    */
    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        const extrinsics = block.block.extrinsics
        const blockEvents = await api.query.system.events.at(blockHash);

        extrinsics.forEach(async (ex, index) =>{

            const extrinsicEvents = blockEvents.filter(e => e.phase.toString() != "Initialization" && e.phase.asApplyExtrinsic.toNumber() == index).map(ev => ev.event.toHuman())
            const extrinsicMethod = ex.method.method
            const extrinsicSection = ex.method.section
            const extrinsicArgs = ex.args
            var motionHash = <string>{}

            if((extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.CLOSE) 
            || (extrinsicSection == ExtrinsicSection.PROXY && extrinsicMethod == ExtrinsicMethod.PROXY)) {

                if(extrinsicSection == ExtrinsicSection.PROXY && extrinsicMethod == ExtrinsicMethod.PROXY){
                    const proxyExtrinsic = JSON.parse(JSON.stringify(ex.args[2]))
                    motionHash = proxyExtrinsic.args.proposal_hash
                } else {
                    motionHash = ex.args[0].toString()
                }

                const result: CouncilMotionEntity[] = await councilMotionRepository.getByMotionHash(extrinsicArgs[0].toString())
                const councilEvents = extrinsicEvents.filter(e => e.section == "council")
                
                if(result.length == 0) {
                    const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{}
                    councilMotion.motion_hash = motionHash
                    const blockId = await blockRepository.getByBlockHash(blockHash)
                    councilMotion.to_block = blockId.id
                    councilMotion.chain_id = chain.id

                    const councilEventMethod = councilEvents.map(ev => ev.method)

                    if(councilEventMethod.some(ev => ev == "Approved")) {
                        councilMotion.status = "approved"
                    } else if(councilEventMethod.some(ev => ev == "Rejected")) {
                        councilMotion.status = "rejected"
                    } else if(councilEventMethod.some(ev => ev == "Disapproved")) {
                        councilMotion.status = "disapproved"
                    }

                    councilMotionRepository.insert(councilMotion)

                } else if(result.length > 0) {

                }

                const bountyEvents = extrinsicEvents.filter(e => e.section == "bounties")

                bountyEvents.forEach(async (be, index) => {
                    const bountyEventJSON = JSON.parse(JSON.stringify(be))
                    const bountyId = bountyEventJSON.data[0]

                    var bountyEntries = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id)

                    if(bountyEntries.length == 0){
                        const bounty: BountyEntity = <BountyEntity>{}

                        switch(be.method){
                            case "BountyRejected": {
                                bounty.status = "rejected"
                                break;
                            }
                            case "BountyClaimed": {
                                bounty.status = "claimed"
                                break;
                            }
                            case "BountyAwarded": {
                                bounty.status = "awarded"
                            }
                            case "BountyAwarded": {
                                bounty.status = "extended"
                            }
                        }
                        bounty.bounty_id = bountyId
    
                        bountyRepository.insert(bounty)
                    }
                    // no need to update this, as this is the first queried extrinsic for bounties
                })
            }

            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.PROPOSE) {
                // council Motion stuff
                // treasury proposal stuff
            }

            if(extrinsicSection == ExtrinsicSection.BOUNTIES && extrinsicMethod == ExtrinsicMethod.PROPOSEBOUNTY) {
                const bountiesProposedEvents = extrinsicEvents.filter(e => e.section == "bounties" && e.method == "BountyProposed")
                bountiesProposedEvents.forEach(async (bpe) => {
                    const bountyId = JSON.parse(JSON.stringify(bpe.data))[0]
                    const entryList = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id)

                    var entry: BountyEntity = <BountyEntity>{}
                    entry.status = "proposed"

                    if(entryList.length > 0){
                        entry = entryList[0]

                    }

                    entry.bounty_id = bountyId
                    entry.description = String(ex.method.args[1].toHuman())
                    entry.value = Number(ex.method.args[0])
                    entry.chain_id = chain.id
                    const proposer = await accountRepository.findByAddress(JSON.parse(JSON.stringify(ex.signer)).id)
                    if(proposer.length > 0) {
                        entry.proposed_by = proposer[0].id
                    } else {
                        const account: AccountEntity = <AccountEntity>{}
                        account.address = JSON.parse(JSON.stringify(ex.signer)).id
                        account.chain_id = chain.id
                        const newEntry = await accountRepository.insert(account)
                        entry.proposed_by = newEntry.id
                    }
                    const blockId = await blockRepository.getByBlockHash(blockHash)
                    entry.proposed_at = blockId.id

                    if(entryList.length > 0){
                        bountyRepository.update(entry)
                    } else {
                        bountyRepository.insert(entry)
                    }

                })
            }


            if(extrinsicSection == ExtrinsicSection.TREASURY && extrinsicMethod == ExtrinsicMethod.PROPOSESPEND) {
                const treasuryProposedEvents = extrinsicEvents.filter(e => e.section == "treasury" && e.method == "Proposed")
                console.log("Treasury: ProposeSpend hit")

                treasuryProposedEvents.forEach( async (tpe) => {
                    const proposalId = JSON.parse(JSON.stringify(tpe.data))[0]
                    const entryList = await treasureProposalRepository.getByProposalIdAndChainId(proposalId, chain.id )

                    if(entryList.length > 0) {
                        const entry = entryList[0]
                        entry.value = Number(ex.method.args[0])
                        const proposer = await accountRepository.findByAddress(JSON.parse(JSON.stringify(ex.signer)).id)
                        if(proposer.length > 0) {
                            entry.proposed_by = proposer[0].id
                        } else {
                            const account: AccountEntity = <AccountEntity>{}
                            account.address = JSON.parse(JSON.stringify(ex.signer)).id
                            account.chain_id = chain.id
                            const newEntry = await accountRepository.insert(account)
                            entry.proposed_by = newEntry.id
                        }
                        const blockId = await blockRepository.getByBlockHash(blockHash)
                    
                        entry.proposed_at = blockId.id

                        treasureProposalRepository.update(entry)
                    }
                })

            }

            if(extrinsicSection == ExtrinsicSection.TIMESTAMP && extrinsicMethod == ExtrinsicMethod.SET) {
                const initializationEvents = blockEvents.filter(e => e.phase.toString() == "Initialization").map(ev => ev.event.toHuman())
                const treasuryEvents = initializationEvents.filter(e => e.section == "treasury" && e.method == "Awarded")

                if(treasuryEvents.length > 0) {
                    treasuryEvents.forEach(async (te) => {
                        const treasuryEventJSON = JSON.parse(JSON.stringify(te))
                        const existingProposal = await treasureProposalRepository.getByProposalIdAndChainId(treasuryEventJSON.data[0], chain.id)
                        if(existingProposal.length == 0) {
                            const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity> {}
                            treasuryProposal.status = "awarded"
                            treasuryProposal.proposal_id = treasuryEventJSON.data[0]
                            const beneficiaryAccount = await accountRepository.findByAddress(treasuryEventJSON.data[2])

                            if(beneficiaryAccount.length > 0) {
                                treasuryProposal.beneficiary = beneficiaryAccount[0].id
                            } else {
                                const account: AccountEntity = <AccountEntity>{}
                                account.address = treasuryEventJSON.data[2]
                                account.chain_id = chain.id
                                var accountEntry = await accountRepository.insert(account)
                                treasuryProposal.beneficiary = accountEntry.id
                            }
                            treasuryProposal.chain_id = chain.id
                            treasureProposalRepository.insert(treasuryProposal)
                        }
                    })
                }
            }

            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.VOTE) {
                const accountId = (JSON.parse(JSON.stringify(ex.signer)).id).toString()
                const motionHash = ex.method.args[0].toString()
                const councilMotion = await councilMotionRepository.getByMotionHash(motionHash)
                var existingVote = []
                if(councilMotion.length > 0) {
                    existingVote = await councilMotionVoteRepository.getByCouncilMotionIdAndAccountId(councilMotion[0].id, accountId)
                }

                if(existingVote.length == 0){
                    const block = await blockRepository.getByBlockHash(blockHash)
                    if(block != null){
                        const approved = ex.method.args[2].toString() == "true"
                        const vote: CouncilMotionVoteEntity = <CouncilMotionVoteEntity>{}
                        vote.account_id = accountId
                        vote.approved = approved
                        vote.council_motion_id = councilMotion[0].id
                        vote.block = block.id
                        councilMotionRepository.insert(vote)
                    }
                }
            }

        })
    }
};