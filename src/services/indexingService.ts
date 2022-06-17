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
import { CouncilMotionStatus } from "../types/enums/CouncilMotionStatus";
import { BountyStatus } from "../types/enums/BountyStatus";
import { TreasuryProposalStatus } from "../types/enums/TreasuryProposalStatus";
import { EventSection } from "../types/enums/EventSection";
import { EventMethod } from "../types/enums/EventMethod";

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
        await indexingService.parseExtrinsic(block, blockHash)
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
        TODO: lots of code that is used several times, summarize duplicate code blocks into functions
        TODO: take a range of blocks and test if the data saved to our db is aligned to what subscan has
        TODO: if(exists) else if(!exists) is often used, can be shortened a lot
        TODO: 
    */
    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        const apiAt = await api.at(blockHash)
        const extrinsics = block.block.extrinsics
        const blockEvents = await apiAt.query.system.events()

        extrinsics.forEach(async (ex, index) =>{
            var extrinsic = JSON.parse(JSON.stringify(ex.toHuman()))
            var extrinsicMethod = extrinsic.method.method
            var extrinsicSection = extrinsic.method.section

            // proxy calls are slightly differently structured, but contain the same data 
            // sometimes we have to handle them differently, rarely though
            var isProxyCall = false

            // handles proxy calls, which have the actual call inside them, so we assign these calls as the currently queried extrinsic
            if(extrinsicSection == ExtrinsicSection.PROXY && extrinsicSection== ExtrinsicMethod.PROXY) {
                extrinsic = extrinsic.method.args.call
                if(extrinsic){
                    extrinsicMethod = extrinsic.method
                    extrinsicSection = extrinsic.section
                }
                isProxyCall = true
            }

            // getting the actual events for the currently queried extrinsic (via index, check subscan) -> initialization and finalization excluded
            const extrinsicEvents = blockEvents.filter(e => e.phase.toString() != "Initialization" && e.phase.toString() != "Finalization"  && e.phase.asApplyExtrinsic.toNumber() == index).map(ev => ev.event.toHuman())

            if((extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.CLOSE)) {

                var motionHash = <string>{}
                var index = <number>{}
                if(isProxyCall){
                    motionHash = extrinsic.args.proposal_hash
                    index = extrinsic.args.index
                } else {
                    motionHash = extrinsic.method.args.proposal_hash
                    index = extrinsic.args.index
                }

                const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash)
                const councilEvents = extrinsicEvents.filter(e => e.section == EventSection.Council) 
                const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{}
                councilMotion.motion_hash = motionHash
                const blockEntry = await blockRepository.getByBlockHash(blockHash)
                councilMotion.to_block = blockEntry.id
                councilMotion.chain_id = chain.id
                const councilEventMethod = councilEvents.map(ev => ev.method)
        
                if(councilEventMethod.some(ev => ev == "Approved")) {
                    councilMotion.status = CouncilMotionStatus.Approved
                } else if(councilEventMethod.some(ev => ev == "Rejected")) {
                    councilMotion.status = CouncilMotionStatus.Rejected
                } else if(councilEventMethod.some(ev => ev == "Disapproved")) {
                    councilMotion.status = CouncilMotionStatus.Disapproved
                }

                if(!councilMotionEntry) {
                        councilMotionRepository.insert(councilMotion)
                } else if(councilMotionEntry) {
                        councilMotionRepository.update(councilMotion)
                }
        
                const bountyEvents = extrinsicEvents.filter(e => e.section == EventSection.Bounties)
                        
                bountyEvents.forEach(async (be) => {
                    const bountyEvent = JSON.parse(JSON.stringify(be))
                    const bountyId = bountyEvent.data[0]
    
                    var bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id)
    
                    if(!bountyEntry){
                        const bounty: BountyEntity = <BountyEntity>{}
    
                        switch(be.method){
                            case "BountyRejected": {
                                bounty.status = BountyStatus.Rejected
                                break;
                            }
                            case "BountyAwarded": {
                                bounty.status = BountyStatus.Awarded
                                break;
                            }
                            case "BountyExtended": {
                                bounty.status = BountyStatus.Extended
                                break;
                            }
                            case "BountyCanceled": {
                                bounty.status = BountyStatus.Cancelled
                                break;
                            }
                        }

                        bounty.chain_id = chain.id
                        bounty.bounty_id = bountyId
                        bountyRepository.insert(bounty)
                    } 
                })       
            }

            /*
                this section fetches the extrinsic where council motions are proposed
                important for: council motion data, treasury proposals
            */
            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.PROPOSE) {
                const proposal = extrinsic.method.args.proposal
                const proposalMethod = proposal.method
                const proposalSection = proposal.section 
                const proposeEvent = extrinsicEvents.find(e => e.method == EventMethod.Proposed && e.section == EventSection.Council)
                const proposalIndex = JSON.parse(JSON.stringify(proposeEvent)).data[1]
                const councilMotionHash = JSON.parse(JSON.stringify(proposeEvent)).data[2]
                var councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash)
                var proposer = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id)

                //TODO this can be shortened by a lot (ON DUPLICATE KEY UPDATE?)
                if(councilMotionEntry) {
                    console.log(councilMotionEntry)
                    const entry = councilMotionEntry
                    entry.method = proposalMethod
                    entry.section = proposalSection
                    entry.proposal_index = proposalIndex
                    //TODO this can be either shortened or put into a seperate function as it is used often
                    if(proposer) {
                        entry.proposed_by = proposer.id
                    } else if(!proposer){
                        const account: AccountEntity = <AccountEntity>{}
                        account.address = extrinsic.signer.Id
                        account.chain_id = chain.id
                        const newEntry = await accountRepository.insert(account)
                        entry.proposed_by = newEntry.id
                    }
                    const blockEntry = await blockRepository.getByBlockHash(blockHash)
                    entry.from_block = blockEntry.id
                    const a = await councilMotionRepository.update(entry)
                } else if(!councilMotionEntry) {
                    const councilMotion = <CouncilMotionEntity>{}
                    councilMotion.chain_id = chain.id
                    councilMotion.motion_hash = councilMotionHash
                    councilMotion.method = proposalMethod
                    councilMotion.section = proposalSection
                    councilMotion.proposal_index = proposalIndex
                    councilMotion.status = CouncilMotionStatus.Proposed
                    if(proposer) {
                        councilMotion.proposed_by = proposer.id
                    } else if(!proposer){
                        const account: AccountEntity = <AccountEntity>{}
                        account.address = extrinsic.signer.Id
                        account.chain_id = chain.id
                        await accountRepository.insertOrUpdateAccount(chain.id, extrinsic.signer.Id)
                        const accountEntry = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id)
                        councilMotion.proposed_by = accountEntry!.id
                    }
                    const blockEntry = await blockRepository.getByBlockHash(blockHash)
                    councilMotion.from_block = blockEntry.id
                    councilMotionEntry = await councilMotionRepository.insert(councilMotion)
                }

                // proposal inside a council motion -> we can get treasury data from that
                if(proposalMethod == ExtrinsicMethod.APPROVEPROPOSAL && proposalSection == ExtrinsicSection.TREASURY){
                    const proposalID = proposal.args.proposal_id
                    const proposalEntry = await treasureProposalRepository.getByProposalIdAndChainId(proposalID, chain.id)
                    councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash)

                    if(proposalEntry) {
                        councilMotionEntry = councilMotionEntry
                        if(councilMotionEntry) {
                            proposalEntry.council_motion_id = councilMotionEntry.id
                            await treasureProposalRepository.update(proposalEntry)
                        }
                    } else if(!proposalEntry) {
                        const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity>{}
                        treasuryProposal.proposal_id = proposalID
                        if(extrinsicEvents.find(e => e.method == EventMethod.Awarded && e.section == EventSection.Treasury)){
                            treasuryProposal.status = TreasuryProposalStatus.Awarded
                        } else {
                            treasuryProposal.status = TreasuryProposalStatus.Proposed
                        }
                        treasuryProposal.chain_id = chain.id
                        if(councilMotionEntry){
                            treasuryProposal.council_motion_id = councilMotionEntry.id
                        }
                        treasureProposalRepository.insert(treasuryProposal)
                    }

                }
            }

            /*
                this section fetches the extrinsic where bounties are proposed. this is where we get the value, description and other important data
            */
            if(extrinsicSection == ExtrinsicSection.BOUNTIES && extrinsicMethod == ExtrinsicMethod.PROPOSEBOUNTY) {
                const bountiesProposedEvents = extrinsicEvents.filter(e => e.section == EventSection.Bounties && e.method == EventMethod.BountyProposed)
                bountiesProposedEvents.forEach(async (bpe) => {
                    const bountyId = JSON.parse(JSON.stringify(bpe.data))[0]
                    const entryList = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id)
                    var entry: BountyEntity = <BountyEntity>{}
                    entry.status = BountyStatus.Proposed

                    if(entryList){
                        entry = entryList
                    }

                    entry.bounty_id = bountyId
                    entry.description = String(extrinsic.method.args.description)
                    entry.value = Number(ex.method.args[0])
                    entry.chain_id = chain.id
                    const proposer = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id)

                    if(proposer) {
                        entry.proposed_by = proposer.id
                    } else if(!proposer) {
                        const account: AccountEntity = <AccountEntity>{}
                        account.address = JSON.parse(JSON.stringify(ex.signer)).id
                        account.chain_id = chain.id
                        await accountRepository.insertOrUpdateAccount(chain.id, extrinsic.signer.Id)
                        const accountEntry = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id)
                        entry.proposed_by = accountEntry!.id
                    }
                    const blockId = await blockRepository.getByBlockHash(blockHash)
                    entry.proposed_at = blockId.id

                    //TODO on Duplicate key update? 
                    if(entryList){
                        bountyRepository.update(entry)
                    } else {
                        bountyRepository.insert(entry)
                    }

                })
            }

            /*
                this section fetches the extrinsic where treasuries are proposed and updates/inserts them
            */
            if(extrinsicSection == ExtrinsicSection.TREASURY && extrinsicMethod == ExtrinsicMethod.PROPOSESPEND) {
                const treasuryProposedEvents = extrinsicEvents.filter(e => e.section == EventSection.Treasury && e.method == EventMethod.Proposed)

                treasuryProposedEvents.forEach( async (tpe) => {
                    const proposalId = JSON.parse(JSON.stringify(tpe.data))[0]
                    const entryList = await treasureProposalRepository.getByProposalIdAndChainId(proposalId, chain.id )

                    if(entryList) {
                        const entry = entryList
                        entry.value = Number(ex.method.args[0])
                        const proposer = await accountRepository.findByAddressAndChain(JSON.parse(JSON.stringify(ex.signer)).id, chain.id)
                        if(proposer) {
                            entry.proposed_by = proposer.id
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

            /*
                this section fetches treasury events that were awarded (are awarded every 10000 (?) blocks, that's why its in the timestamp set extrinsic)
            */
            if(extrinsicSection == ExtrinsicSection.TIMESTAMP && extrinsicMethod == ExtrinsicMethod.SET) {
                const initializationEvents = blockEvents.filter(e => e.phase.toString() == "Initialization").map(ev => ev.event.toHuman())
                const treasuryEvents = initializationEvents.filter(e => e.section == EventSection.Treasury && e.method == EventMethod.Awarded)

                if(treasuryEvents.length > 0) {
                    treasuryEvents.forEach(async (te) => {
                        const treasuryEventJSON = JSON.parse(JSON.stringify(te))
                        const existingProposal = await treasureProposalRepository.getByProposalIdAndChainId(treasuryEventJSON.data[0], chain.id)
                        if(existingProposal) {
                            const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity> {}
                            treasuryProposal.status = TreasuryProposalStatus.Awarded
                            treasuryProposal.proposal_id = treasuryEventJSON.data[0]
                            const beneficiaryAccount = await accountRepository.findByAddressAndChain(treasuryEventJSON.data[2], chain.id)

                            if(beneficiaryAccount) {
                                treasuryProposal.beneficiary = beneficiaryAccount.id
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

            /*
                this section fetches claimed bounties (last step so no update needed)
            */
            const claimedEvents = extrinsicEvents.filter(ev => ev.section == EventSection.Bounties && ev.method == EventMethod.BountyClaimed)
            if(claimedEvents) {
                claimedEvents.forEach((ce) => {
                    const claimEventData = JSON.parse(JSON.stringify(ce.data))           
                    const bounty = <BountyEntity>{}
                    bounty.bounty_id = claimEventData[0]
                    bounty.status = BountyStatus.Claimed
                    bounty.chain_id = chain.id
                    bountyRepository.insert(bounty)
                })
            }

            /*
                this section fetches the votes
            */
            if(extrinsicSection == ExtrinsicSection.COUNCIL && extrinsicMethod == ExtrinsicMethod.VOTE) {
                const accountId = (JSON.parse(JSON.stringify(ex.signer)).id).toString()

                var motionHash = <string>{}
                var voteApproved = <boolean>{}
                if(isProxyCall){
                    motionHash = extrinsic.args.proposal
                    voteApproved = extrinsic.args.approve
                } else {
                    motionHash = extrinsic.method.args.proposal
                    voteApproved = extrinsic.method.args.approve
                }
                const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash)

                var existingVote = <any>{}
                if(councilMotionEntry) {
                    existingVote = await councilMotionVoteRepository.getByCouncilMotionIdAndAccountId(councilMotionEntry.id, accountId)
                }

                if(!existingVote){
                    const block = await blockRepository.getByBlockHash(blockHash)
                    if(block){
                        const approved = voteApproved
                        const vote: CouncilMotionVoteEntity = <CouncilMotionVoteEntity>{}
                        const voter = await accountRepository.findByAddressAndChain(accountId, chain.id)

                        if(voter) {
                            vote.account_id = voter.id
                        } else {
                            const account: AccountEntity = <AccountEntity>{}
                            account.address = accountId
                            account.chain_id = chain.id
                            var accountEntry = await accountRepository.insert(account)
                            vote.account_id = accountEntry.id
                        }
                        vote.approved = approved

                        if(councilMotionEntry) {
                           vote.council_motion_id = councilMotionEntry.id
                        } else {
                            const councilMotionEntry = <CouncilMotionEntity>{}
                            councilMotionEntry.chain_id = chain.id
                            councilMotionEntry.motion_hash = motionHash
                            var entry = await councilMotionRepository.insert(councilMotionEntry)
                            vote.council_motion_id = entry.id
                        }
                        vote.block = block.id
                        councilMotionVoteRepository.insert(vote)
                    }
                }
            }

        })
    }
};