import { AnyJson } from "@polkadot/types-codec/types";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { BlockEntity } from "../types/entities/BlockEntity";
import { BountyEntity } from "../types/entities/BountyEntity";
import { BountyMethod } from "../types/enums/BountyMethod";
import { BountyStatus } from "../types/enums/BountyStatus";
import { ChainEntity } from "../types/entities/ChainEntity";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";
import { CouncilMotionStatus } from "../types/enums/CouncilMotionStatus";
import { CouncilMotionVoteEntity } from "../types/entities/CouncilMotionVoteEntity";
import { CouncilorEntity } from "../types/entities/CouncilorEntity";
import { CounciltermEntity } from "../types/entities/CounciltermEntity";
import { EndorsementEntity } from "./../types/entities/EndorsementEntity";
import { EventMethod } from "../types/enums/EventMethod";
import { EventSection } from "../types/enums/EventSection";
import { ExtrinsicMethod } from "../types/enums/ExtrinsicMethod";
import { ExtrinsicPhase } from "../types/enums/ExtrinsicPhase";
import { ExtrinsicSection } from "../types/enums/ExtrinsicSection";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { ProposalEntity } from "../types/entities/ProposalEntity";
import { ProposalStatus } from "../types/enums/ProposalStatus";
import { ReferendumEntity } from "../types/entities/ReferendumEntity";
import { ReferendumStatus } from "../types/enums/ReferendumStatus";
import { ReferendumVoteEntity } from "../types/entities/ReferendumVoteEntity";
import { SignedBlock } from "@polkadot/types/interfaces";
import { TipEntity } from "../types/entities/TipEntity";
import { TipProposalEntity } from "../types/entities/TipProposalEntity";
import { TipProposalStatus } from "./../types/enums/TipProposalStatus";
import { TreasuryProposalEntity } from "../types/entities/TreasuryProposalEntity";
import { TreasuryProposalStatus } from "../types/enums/TreasuryProposalStatus";
import { Vec, createTypeUnsafe } from "@polkadot/types";
import { Vote } from "../types/enums/Vote";
import { accountRepository } from "../repositories/accountRepository";
import { blockMapper } from "./mapper/blockMapper";
import { blockRepository } from "../repositories/blockRepository";
import { bountyRepository } from "../repositories/bountyRepository";
import { chainService } from "./chainService";
import { councilMotionRepository } from "../repositories/councilMotionRepository";
import { councilMotionVoteRepository } from "../repositories/councilMotionVoteRepository";
import { councilorRepository } from "../repositories/councilorRepository";
import { counciltermRepository } from "../repositories/counciltermRepository";
import { endorsementRepository } from "../repositories/endorsementRepository";
import { proposalRepository } from "../repositories/proposalRepository";
import { referendumRepository } from "../repositories/referendumRepository";
import { referendumVoteRepository } from "../repositories/referendumVoteRepository";
import { tipProposalRepository } from "../repositories/tipProposalRepository";
import { tipRepository } from "../repositories/tipRepository";
import { treasuryProposalRepository } from "../repositories/treasuryProposalRepository";
import { ProposalType } from "../types/enums/ProposalType";
import { translateIfByte, parseAmount } from "./utils/indexingUtil";

let chain: ChainEntity;
let wsProvider: WsProvider;
let api: ApiPromise;

export const indexingService = {

    /*
    * getting the block and if the block number is bigger than "to", repeat
    * calling the parseBlock function
    */
    async readBlock(blockHash: string, from: number, to: number): Promise<void> {
        const block = await api.rpc.chain.getBlock(blockHash);
        if (block.block.header.number.toNumber() >= to) indexingService.readBlock(block.block.header.parentHash.toString(), from, to);
        else {
            console.log(new Date());
            return;
        }
        await indexingService.parseBlock(block, blockHash);
    },

    /*
    * This function calls the parseExtrinsic function for a given block.
    * Errors are caught and logged to the database entry of the block in which the error occured.
    * After indexing, it might make sense to check if any errors occured.
    */
    async parseBlock(block: SignedBlock, blockHash: string): Promise<void> {
        try {
            await indexingService.parseExtrinsic(block, blockHash);
        } catch (e) {
            console.log("[indexingService] Error parsing block: ", e);
            const block = await blockRepository.getByBlockHash(blockHash);
            if (block) {
                block.error = true;
                block.error_message = String(e);
                await blockRepository.update(block);
            }
        }
    },

    /*
    * Initializing the connection to the node and getting the hast of the initial indexing block
    */
    async indexChain(wsProviderAddress: string, from: number, to: number): Promise<void> {
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress, 1000, {}, 500000);
        api = await ApiPromise.create({ provider: wsProvider });
        const startHash = await api.rpc.chain.getBlockHash(from);
        indexingService.readBlock(startHash.toString(), from, to);
    },


    /*
    * This function parses the every extrinsic of the given block and calls the the parseMethodAndSection function at the end.
    * The indexer in general works by getting the latest block and indexing backwards by getting parent hashes.
    * The clusterService seperates the total block range into several batches, depending on the number of cpu cores available to increase efficiency.
    * The data is fetched from the polkadot js api and then saved to the database.
    * We get the data through the extrinsic and event records of the block.
    */
    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        console.time("BLOCK: " + block.block.header.number.toNumber());

        let blockEntity = <BlockEntity>{};
        if (await blockRepository.existsByBlockHash(blockHash)) return;
        else blockEntity = await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id, false, ""));

        const apiAt = await api.at(blockHash);
        const extrinsics = block.block.extrinsics;
        const blockEvents = await apiAt.query.system.events();

        for (let index = 0; index < extrinsics.length; index++) {
            const ex = extrinsics[index];
            const extrinsic = JSON.parse(JSON.stringify(ex.toHuman()));
            const extrinsicMethod = extrinsic.method.method;
            const extrinsicSection = extrinsic.method.section;
            const args = extrinsic.method.args;
            let extrinsicSigner: string;

            if (ex.signer) {
                extrinsicSigner = ex.signer.toString();
            } else extrinsicSigner = "None";

            const extrinsicEvents = blockEvents.filter((e: FrameSystemEventRecord) => e.phase.toString() != ExtrinsicPhase.INITIALIZATION && e.phase.toString() != ExtrinsicPhase.FINALIZATION && e.phase.asApplyExtrinsic.toNumber() === index).map((ev: FrameSystemEventRecord) => ev.event.toHuman());
            if (extrinsicEvents.some((ev: Record<string, AnyJson>) => ev.section === EventSection.System && ev.method === EventMethod.ExtrinsicFailed)) return;

            await this.parseMethodAndSection(extrinsicSection, extrinsicMethod, extrinsic, extrinsicEvents, blockEvents, args, blockEntity, extrinsicSigner);
        }
        console.timeEnd("BLOCK: " + block.block.header.number.toNumber());
    },

    /*
    * This function asynchronously parses the extrinsic section and method and calls the appropriate function to handle them.
    */
    async parseMethodAndSection(extrinsicSection: string, extrinsicMethod: string, extrinsic: any, extrinsicEvents: Record<string, AnyJson>[], blockEvents: Vec<FrameSystemEventRecord>, args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        switch (extrinsicSection) {
            case (ExtrinsicSection.COUNCIL):
                if (extrinsicMethod === ExtrinsicMethod.VOTE) await this.parseCouncilVote(args, blockEntity, chain, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.CLOSE) await this.parseCouncilClose(extrinsicEvents, args, blockEntity);
                if (extrinsicMethod === ExtrinsicMethod.PROPOSE) await this.parseCouncilPropose(extrinsicEvents, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.BOUNTIES):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSEBOUNTY) await this.parseProposeBounty(extrinsicEvents, args, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.CLAIMBOUNTY) await this.parseClaimBounty(extrinsicEvents, blockEntity);
                break;
            case (ExtrinsicSection.TREASURY):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSESPEND) await this.parseTreasuryProposeSpend(extrinsicEvents, args, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.PROPOSEBOUNTY) await this.parseProposeBounty(extrinsicEvents, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.TIMESTAMP):
                if (extrinsicMethod === ExtrinsicMethod.SET) await this.parseTimestampSet(blockEvents, blockEntity);
                break;
            case (ExtrinsicSection.MULTISIG):
                if (extrinsicMethod === ExtrinsicMethod.ASMULTI) await this.parseMultisigAsMulti(extrinsicSection, extrinsicMethod, extrinsicEvents, extrinsic, args, blockEvents, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.DEMOCRACY):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSE) await this.parseDemocracyPropose(extrinsicEvents, args, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.SECOND) await this.parseDemocracySecond(extrinsicEvents, blockEntity);
                if (extrinsicMethod === ExtrinsicMethod.VOTE) await this.parseDemocracyVote(args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.TIPS):
                await this.parseTipExtrinsics(extrinsicEvents, extrinsicMethod, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.UTILITY):
                if (extrinsicMethod === ExtrinsicMethod.BATCH) await this.parseUtilityBatch(extrinsicEvents, extrinsic, args, blockEvents, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.BATCHALL) await this.parseUtilityBatch(extrinsicEvents, extrinsic, args, blockEvents, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.TECHNICALCOMMITTEE):
                if (extrinsicMethod === ExtrinsicMethod.CLOSE) await this.parseTechnicalCommitteeClose(extrinsicEvents, args, blockEntity);
                if (extrinsicMethod === ExtrinsicMethod.PROPOSE) await this.parseTechnicalCommitteePropose(extrinsicEvents, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.PROXY):
                if (extrinsicMethod === ExtrinsicMethod.PROXY) await this.parseProxyProxy(extrinsicSection, extrinsicMethod, extrinsicEvents, extrinsic, args, blockEvents, blockEntity, extrinsicSigner);
                break;
        }
    },

    /*
    * This function extracts the call included in a proxy proxy extrinsic and calls the parseMethodAndSection function to handle the call.
    */
    async parseProxyProxy(extrinsicSection: string, extrinsicMethod: string, extrinsicEvents: Record<string, AnyJson>[], extrinsic: any, args: any, blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        extrinsic = args.call;
        extrinsicSigner = args.real;
        extrinsicMethod = extrinsic.method;
        extrinsicSection = extrinsic.section;
        args = extrinsic.args;
        await this.parseMethodAndSection(extrinsicSection, extrinsicMethod, extrinsic, extrinsicEvents, blockEvents, args, blockEntity, extrinsicSigner);
    },

    /*
    * This functions extracts the call included in a multisig asMulti extrinsic and calls the parseMethodAndSection function to handle the call.
    */
    async parseMultisigAsMulti(extrinsicSection: string, extrinsicMethod: string, extrinsicEvents: Record<string, AnyJson>[], extrinsic: any, args: any, blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        extrinsic = args.call;
        extrinsicMethod = extrinsic.method;
        extrinsicSection = extrinsic.section;
        args = extrinsic.args;
        await this.parseMethodAndSection(extrinsicSection, extrinsicMethod, extrinsic, extrinsicEvents, blockEvents, args, blockEntity, extrinsicSigner);
    },

    /*
    * This function extracts the multiple calls included in a utility batch extrinsic and calls the parseMethodAndSection function to handle each call.
    * Will also be called for the extrinsic utility batchAll.
    */
    async parseUtilityBatch(extrinsicEvents: Record<string, AnyJson>[], extrinsic: any, args: any, blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        for (let index = 0; index < args.calls.length; index++) {
            const call = args.calls[index];
            await this.parseMethodAndSection(call.section, call.method, extrinsic, extrinsicEvents, blockEvents, call.args, blockEntity, extrinsicSigner);
        }
    },

    /*
    * This function parses the council close extrinsic and creates or updates corresponding entities in the database. (council_motion and bounty)
    */
    async parseCouncilClose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity): Promise<void> {
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(args.proposal_hash);
        const councilEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Council);
        if (councilEvents) {
            const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{
                motion_hash: args.proposal_hash,
                proposal_index: Number(args.index),
                to_block: blockEntity.id,
                chain_id: chain.id,
                modified_at: blockEntity.id
            };
            const councilEventMethod = councilEvents.map((ev: Record<string, AnyJson>) => ev.method);

            if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Approved)) {
                councilMotion.status = CouncilMotionStatus.Approved;
            } else if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Rejected)) {
                councilMotion.status = CouncilMotionStatus.Rejected;
            } else if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Disapproved)) {
                councilMotion.status = CouncilMotionStatus.Disapproved;
            }

            if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Executed)) {
                councilMotion.status = CouncilMotionStatus.Executed;
            }

            if (!councilMotionEntry) {
                await councilMotionRepository.insert(councilMotion);
            } else if (councilMotionEntry) {
                councilMotionEntry.proposal_index = councilMotion.proposal_index;
                councilMotionEntry.to_block = councilMotion.to_block;
                councilMotionEntry.status = councilMotion.status;
                councilMotionEntry.modified_at = blockEntity.id;
                await councilMotionRepository.update(councilMotionEntry);
            }
        }

        const bountyEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Bounties);
        for (let index = 0; index < bountyEvents.length; index++) {
            const be = bountyEvents[index];
            const bountyEvent = JSON.parse(JSON.stringify(be));
            const bountyId = bountyEvent.data[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);
            const bounty: BountyEntity = <BountyEntity>{
                chain_id: chain.id,
                bounty_id: bountyId,
                modified_at: blockEntity.id
            };
            switch (be.method) {
                case BountyMethod.BountyRejected: {
                    bounty.status = BountyStatus.Rejected;
                    break;
                }
                case BountyMethod.BountyAwarded: {
                    bounty.status = BountyStatus.Awarded;
                    break;
                }
                case BountyMethod.BountyExtended: {
                    bounty.status = BountyStatus.Extended;
                    break;
                }
                case BountyMethod.BountyCancelled: {
                    bounty.status = BountyStatus.Cancelled;
                    break;
                }
            }
            if (!bountyEntry) {
                await bountyRepository.insert(bounty);
            } else {
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, bountyEntry.modified_at)) {
                    bountyEntry.status = bounty.status;
                    bountyEntry.modified_at = blockEntity.id;
                }
                await bountyRepository.update(bountyEntry);
            }
        }
    },

    /*
    * This function parses the council propose extrinsic and creates or updates corresponding entities in the database. (council_motion, treasury_proposal)
    */
    async parseCouncilPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const proposal = args.proposal;
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.Council);
        if (proposeEvent) {
            const proposalIndex = JSON.parse(JSON.stringify(proposeEvent)).data[1];
            const councilMotionHash = JSON.parse(JSON.stringify(proposeEvent)).data[2];
            const councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash);
            const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

            if (councilMotionEntry) {
                councilMotionEntry.method = proposal.method;
                councilMotionEntry.section = proposal.section;
                councilMotionEntry.proposal_index = proposalIndex;
                councilMotionEntry.proposed_by = proposer.id;
                councilMotionEntry.from_block = blockEntity.id;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, councilMotionEntry.modified_at)) {
                    councilMotionEntry.status = CouncilMotionStatus.Proposed;
                    councilMotionEntry.modified_at = blockEntity.id;
                }
                await councilMotionRepository.update(councilMotionEntry);
            } else if (!councilMotionEntry) {
                const councilMotion = <CouncilMotionEntity>{
                    chain_id: chain.id,
                    motion_hash: councilMotionHash,
                    proposal_index: proposalIndex,
                    method: proposal.method,
                    section: proposal.section,
                    proposed_by: proposer.id,
                    from_block: blockEntity.id,
                    status: CouncilMotionStatus.Proposed,
                    modified_at: blockEntity.id
                };
                await councilMotionRepository.insert(councilMotion);
            }

            if (proposal.method === ExtrinsicMethod.APPROVEPROPOSAL && proposal.section === ExtrinsicSection.TREASURY) {
                const proposalID = proposal.args.proposal_id;
                const proposalEntry = await treasuryProposalRepository.getByProposalIdAndChainId(proposalID, chain.id);
                if (proposalEntry) {
                    if (await blockRepository.hasHigherBlockNumber(blockEntity.id, proposalEntry.modified_at)) {
                        if (extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Awarded && e.section === EventSection.Treasury)) {
                            proposalEntry.status = TreasuryProposalStatus.Awarded;
                        } else {
                            proposalEntry.status = TreasuryProposalStatus.Proposed;
                        }
                        await treasuryProposalRepository.update(proposalEntry);
                    }
                } else if (!proposalEntry) {
                    const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity>{};
                    treasuryProposal.proposal_id = proposalID;

                    if (extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Awarded && e.section === EventSection.Treasury)) {
                        treasuryProposal.status = TreasuryProposalStatus.Awarded;
                    } else {
                        treasuryProposal.status = TreasuryProposalStatus.Proposed;
                    }
                    treasuryProposal.chain_id = chain.id;
                    treasuryProposal.modified_at = blockEntity.id;
                    await treasuryProposalRepository.insert(treasuryProposal);
                }
            }
        }
    },

    /*
    * This function parses the propose bounty extrinsic and creates or updates corresponding entities in the database. (bounty)
    */
    async parseProposeBounty(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const bountiesProposedEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Bounties && e.method === EventMethod.BountyProposed);
        if (bountiesProposedEvent) {
            const bpe = JSON.parse(JSON.stringify(bountiesProposedEvent));
            const bountyId = bpe.data[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);
            let entry: BountyEntity = <BountyEntity>{};
            entry.status = BountyStatus.Proposed;

            if (bountyEntry) {
                entry = bountyEntry;
            }
            const value = parseAmount(args.value, chain);
            entry.bounty_id = bountyId;
            entry.description = String(args.description);
            entry.value = value
            entry.chain_id = chain.id;
            const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
            entry.proposed_by = proposer.id;
            entry.proposed_at = blockEntity.id;
            entry.modified_at = blockEntity.id;

            if (!bountyEntry) {
                await bountyRepository.insert(entry);
            } else {
                bountyEntry.bounty_id = entry.id;
                bountyEntry.description = entry.description;
                bountyEntry.value = value;
                bountyEntry.chain_id = entry.chain_id;
                bountyEntry.proposed_by = entry.proposed_by;
                bountyEntry.proposed_at = entry.proposed_at;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, bountyEntry.modified_at)) {
                    bountyEntry.status = entry.status;
                    bountyEntry.modified_at = entry.modified_at;
                }
                await bountyRepository.update(bountyEntry);
            }
        }
    },

    /*
    * This function parses the treasury proposeSpend extrinsic and creates or updates corresponding entities in the database. (treasury)
    */
    async parseTreasuryProposeSpend(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const treasuryProposedEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Treasury && e.method === EventMethod.Proposed);
        if (treasuryProposedEvent) {
            const tpe = JSON.parse(JSON.stringify(treasuryProposedEvent));
            const proposalId = tpe.data[0];
            const tpEntry = await treasuryProposalRepository.getByProposalIdAndChainId(proposalId, chain.id);
            const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
            const value = parseAmount(args.value, chain);

            if (tpEntry) {
                tpEntry.value = value;
                tpEntry.proposed_by = proposer.id;
                tpEntry.proposed_at = blockEntity.id;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, tpEntry.modified_at)) {
                    tpEntry.status = TreasuryProposalStatus.Proposed;
                    tpEntry.modified_at = blockEntity.id;
                }
                await treasuryProposalRepository.update(tpEntry);
            } else {
                const tp = <TreasuryProposalEntity>{
                    proposal_id: proposalId,
                    chain_id: chain.id,
                    status: TreasuryProposalStatus.Proposed,
                    proposed_by: proposer.id,
                    proposed_at: blockEntity.id,
                    modified_at: blockEntity.id,
                    value: value
                };
                await treasuryProposalRepository.insert(tp);
            }
        }
    },

    /*
    * This function handles timestamp set extrinsic and creates or updates corresponding entities in the database. (proposal, referendum, treasury_proposal, councilterm)
    */
    async parseTimestampSet(blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity): Promise<void> {
        const initializationEvents = blockEvents.filter((e: any) => e.phase.toString() === ExtrinsicPhase.INITIALIZATION).map((ev: FrameSystemEventRecord) => ev.event.toHuman());
        const treasuryEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Treasury && e.method === EventMethod.Awarded);
        const newCounciltermEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.PhragmenElection && e.method === EventMethod.NewTerm);
        const democracyTabledEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.Tabled);
        const democracyStartedEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.Started);
        const democracyExecutedEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.Executed);
        const democracyPassedEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.Passed);
        const democracyNotPassedEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.NotPassed);
        const democracyCancelledEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section === EventSection.Democracy && e.method === EventMethod.Cancelled);

        if (democracyStartedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyStartedEvent.data))[0];
            const voteThreshold = JSON.parse(JSON.stringify(democracyStartedEvent.data))[1];
            let proposalId: number | null;

            if (democracyTabledEvent) {
                const proposal = await proposalRepository.getByProposalIndexAndChainIdAndType(JSON.parse(JSON.stringify(democracyTabledEvent.data))[0], chain.id, ProposalType.Democracy);
                if (!proposal) {
                    const proposalEntity = <ProposalEntity>{
                        proposal_index: JSON.parse(JSON.stringify(democracyTabledEvent.data))[0]!,
                        chain_id: chain.id,
                        status: ProposalStatus.Tabled,
                        modified_at: blockEntity.id,
                        type: ProposalType.Democracy
                    };
                    const proposalEntry = await proposalRepository.insert(proposalEntity);
                    proposalId = proposalEntry.id;
                } else {
                    if (await blockRepository.hasHigherBlockNumber(blockEntity.id, proposal.modified_at)) {
                        proposal.status = ProposalStatus.Tabled;
                        proposal.modified_at = blockEntity.id;
                    }
                    await proposalRepository.update(proposal);
                    proposalId = proposal.id;
                }
            } else proposalId = null;

            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    chain_id: chain.id,
                    referendum_index: referendum_index,
                    vote_threshold: voteThreshold,
                    status: ReferendumStatus.Started,
                    started_at: blockEntity.id,
                    proposal_id: proposalId,
                    modified_at: blockEntity.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                referendum.started_at = blockEntity.id;
                referendum.vote_threshold = voteThreshold;
                if (proposalId) referendum.proposal_id = proposalId;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, referendum.modified_at)) {
                    referendum.status = ReferendumStatus.Started;
                    referendum.modified_at = blockEntity.id;
                }
                await referendumRepository.update(referendum);
            }
        }

        if (democracyExecutedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyExecutedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    chain_id: chain.id,
                    status: ReferendumStatus.Executed,
                    ended_at: blockEntity.id,
                    modified_at: blockEntity.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.Executed;
                referendum.modified_at = blockEntity.id;
                referendum.ended_at = blockEntity.id;
                await referendumRepository.update(referendum);
            }
        }

        if (democracyPassedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyPassedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    chain_id: chain.id,
                    status: ReferendumStatus.Passed,
                    modified_at: blockEntity.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, referendum.modified_at)) {
                    referendum.status = ReferendumStatus.Passed;
                    referendum.modified_at = blockEntity.id;
                }
                await referendumRepository.update(referendum);
            }
        }

        if (democracyNotPassedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyNotPassedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    chain_id: chain.id,
                    status: ReferendumStatus.NotPassed,
                    ended_at: blockEntity.id,
                    modified_at: blockEntity.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.NotPassed;
                referendum.modified_at = blockEntity.id;
                referendum.ended_at = blockEntity.id;
                await referendumRepository.update(referendum);
            }
        }

        if (democracyCancelledEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyCancelledEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    chain_id: chain.id,
                    status: ReferendumStatus.Cancelled,
                    ended_at: blockEntity.id,
                    modified_at: blockEntity.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.Cancelled;
                referendum.modified_at = blockEntity.id;
                referendum.ended_at = blockEntity.id;
                await referendumRepository.update(referendum);
            }
        }

        if (newCounciltermEvent) {
            const councilterm = <CounciltermEntity>{};
            councilterm.from_block = blockEntity.id;
            councilterm.chain_id = chain.id;
            const counciltermInsert = await counciltermRepository.insert(councilterm);
            const counciltermData = Array(newCounciltermEvent.data).flat().flat();
            for (let i = 0; i < counciltermData.length; i++) {
                const ctd = counciltermData[i];
                const councilorEntity = <CouncilorEntity>{};
                const address = String(Array(ctd).flat()[0]);
                councilorEntity.councilterm_id = counciltermInsert.id;
                const account = await accountRepository.getOrCreateAccount(address, chain.id);
                councilorEntity.account_id = account.id;
                await councilorRepository.insert(councilorEntity);
            }
        }

        if (treasuryEvent) {
            const te = JSON.parse(JSON.stringify(treasuryEvent));
            const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity>{};
            const existingProposal = await treasuryProposalRepository.getByProposalIdAndChainId(te.data[0], chain.id);
            const beneficiaryAccount = await accountRepository.getOrCreateAccount(te.data[2], chain.id);
            if (!existingProposal) {
                treasuryProposal.status = TreasuryProposalStatus.Awarded;
                treasuryProposal.proposal_id = te.data[0];
                treasuryProposal.beneficiary = beneficiaryAccount.id;
                treasuryProposal.chain_id = chain.id;
                treasuryProposal.modified_at = blockEntity.id;
                await treasuryProposalRepository.insert(treasuryProposal);
            } else {
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, existingProposal.modified_at)) {
                    existingProposal.status = TreasuryProposalStatus.Awarded;
                    existingProposal.modified_at = blockEntity.id;
                }
                existingProposal.beneficiary = beneficiaryAccount.id;
                await treasuryProposalRepository.update(existingProposal);
            }
        }
    },

    /*
    * This function parses the claim bounty extrinsic and creates a bounty with the claim status.
    */
    async parseClaimBounty(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity): Promise<void> {
        const claimedEvent = extrinsicEvents.find((ev: Record<string, AnyJson>) => ev.section === EventSection.Bounties && ev.method === EventMethod.BountyClaimed);
        if (claimedEvent) {
            const ce = JSON.parse(JSON.stringify(claimedEvent));
            const claimEventData = ce.data;
            const bountyIndex = claimEventData[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyIndex, chain.id);
            if (!bountyEntry) {
                const bounty = <BountyEntity>{
                    bounty_id: bountyIndex,
                    status: BountyStatus.Claimed,
                    chain_id: chain.id,
                    modified_at: blockEntity.id
                };
                await bountyRepository.insert(bounty);
            } else {
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, bountyEntry.modified_at)) {
                    bountyEntry.status = BountyStatus.Claimed;
                    bountyEntry.modified_at = blockEntity.id;
                }
                await bountyRepository.update(bountyEntry);
            }
        }
    },

    /*
    * This function parses the council vote extrinsic and creates or updates the corresponding entities in the database. (council_motion_vote, council_motion)
    */
    async parseCouncilVote(args: any, blockEntity: BlockEntity, chain: ChainEntity, extrinsicSigner: string): Promise<void> {
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(args.proposal);
        const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
        let councilMotionId = <number>{};
        let existingVote = <any>{};
        if (councilMotionEntry) councilMotionId = councilMotionEntry.id;
        else {
            const councilMotion = <CouncilMotionEntity>{
                motion_hash: args.proposal,
                chain_id: chain.id,
                modified_at: blockEntity.id
            };
            const entry = await councilMotionRepository.insert(councilMotion);
            councilMotionId = entry.id;
        }
        existingVote = await councilMotionVoteRepository.getByCouncilMotionIdAndAccountId(councilMotionId, account.id);
        if (!existingVote) {
            const approved = args.approve;
            const vote: CouncilMotionVoteEntity = <CouncilMotionVoteEntity>{
                council_motion_id: councilMotionId,
                account_id: account.id,
                approved: approved,
                block: blockEntity.id
            };
            await councilMotionVoteRepository.insert(vote);
        }
    },

    /*
    * This function parses multiple tip extrinsics and creates or updates the corresponding entities in the database. (tip_proposal, tip)
    */
    async parseTipExtrinsics(extrinsicEvents: Record<string, AnyJson>[], extrinsicMethod: any, args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        switch (extrinsicMethod) {
            case ExtrinsicMethod.REPORTAWESOME: {
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.NewTip);
                if (tipEvent) {
                    const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                    const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                    const beneficiary = await accountRepository.getOrCreateAccount(args.who, chain.id);
                    const finder = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

                    if (tipProposalEntry) {
                        tipProposalEntry.reason = translateIfByte(args.reason);
                        tipProposalEntry.chain_id = chain.id;
                        tipProposalEntry.proposed_at = blockEntity.id;
                        tipProposalEntry.motion_hash = motionHash;
                        tipProposalEntry.beneficiary = beneficiary.id;
                        tipProposalEntry.finder = finder.id;
                        if (await blockRepository.hasHigherBlockNumber(blockEntity.id, tipProposalEntry.modified_at)) {
                            tipProposalEntry.status = TipProposalStatus.Proposed;
                            tipProposalEntry.modified_at = blockEntity.id;
                        }
                        await tipProposalRepository.update(tipProposalEntry);
                    } else if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{
                            reason: translateIfByte(args.reason),
                            chain_id: chain.id,
                            proposed_at: blockEntity.id,
                            status: TipProposalStatus.Proposed,
                            motion_hash: motionHash,
                            beneficiary: beneficiary.id,
                            finder: finder.id,
                            modified_at: blockEntity.id
                        };
                        await tipProposalRepository.insert(tipProposal);
                    }
                }
                break;
            }
            case ExtrinsicMethod.TIPNEW: {
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.NewTip);
                if (tipEvent) {
                    const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                    const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                    const beneficiary = await accountRepository.getOrCreateAccount(args.who, chain.id);
                    const finder = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                    const value = parseAmount(args.tip_value, chain)

                    if (tipProposalEntry) {
                        tipProposalEntry.reason = translateIfByte(args.reason);
                        tipProposalEntry.chain_id = chain.id;
                        tipProposalEntry.proposed_at = blockEntity.id;
                        tipProposalEntry.motion_hash = motionHash;
                        tipProposalEntry.beneficiary = beneficiary.id;
                        tipProposalEntry.finder = finder.id;
                        tipProposalEntry.value = value;
                        if (await blockRepository.hasHigherBlockNumber(blockEntity.id, tipProposalEntry.modified_at)) {
                            tipProposalEntry.status = TipProposalStatus.Proposed;
                            tipProposalEntry.modified_at = blockEntity.id;
                        }
                        await tipProposalRepository.update(tipProposalEntry);
                    } else if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{
                            reason: translateIfByte(args.reason),
                            chain_id: chain.id,
                            proposed_at: blockEntity.id,
                            status: TipProposalStatus.Proposed,
                            motion_hash: motionHash,
                            beneficiary: beneficiary.id,
                            finder: finder.id,
                            modified_at: blockEntity.id,
                            value: value
                        };
                        await tipProposalRepository.insert(tipProposal);
                    }
                }
                break;
            }
            case ExtrinsicMethod.RETRACTTIP: {
                const motionHash = args.hash;
                const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                if (!tipProposalEntry) {
                    const tipProposal = <TipProposalEntity>{
                        motion_hash: motionHash,
                        chain_id: chain.id,
                        status: TipProposalStatus.Retracted,
                        modified_at: blockEntity.id
                    };
                    await tipProposalRepository.insert(tipProposal);
                } else {
                    tipProposalEntry.status = TipProposalStatus.Retracted;
                    tipProposalEntry.modified_at = blockEntity.id;
                    await tipProposalRepository.update(tipProposalEntry);
                }
                break;
            }
            case ExtrinsicMethod.CLOSETIP: {
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.TipClosed);
                if (tipEvent) {
                    const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                    const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                    const value = parseAmount(JSON.parse(JSON.stringify(tipEvent!.data))[2], chain);

                    if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{
                            motion_hash: motionHash,
                            chain_id: chain.id,
                            status: TipProposalStatus.Closed,
                            value: value,
                            modified_at: blockEntity.id
                        };
                        await tipProposalRepository.insert(tipProposal);
                    } else if (tipProposalEntry) {
                        tipProposalEntry.status = TipProposalStatus.Closed;
                        tipProposalEntry.modified_at = blockEntity.id;
                        tipProposalEntry.value = value;
                        tipProposalEntry.chain_id = chain.id;
                        await tipProposalRepository.update(tipProposalEntry);
                    }
                }
                break;
            }
            case ExtrinsicMethod.TIP: {
                const tip: TipEntity = <TipEntity>{};
                const motionHash = args.hash;

                const proposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                if (proposalEntry) {
                    tip.tip_proposal_id = proposalEntry.id;
                } else {
                    const tipProposal = <TipProposalEntity>{
                        motion_hash: motionHash,
                        chain_id: chain.id,
                        modified_at: blockEntity.id
                    };
                    const insertedTipProposal = await tipProposalRepository.insert(tipProposal);
                    tip.tip_proposal_id = insertedTipProposal.id;
                }
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                tip.tipper = account.id;
                tip.value = parseAmount(args.tip_value, chain);
                tip.tipped_at = blockEntity.id;
                await tipRepository.insert(tip);
                break;
            }
        }
    },

    /*
    * This function parses the democracy propose extrinsic and creates or updates the corresponding entities in the database. (proposal)
    */
    async parseDemocracyPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const proposalHash = JSON.parse(JSON.stringify(args.proposal_hash));
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.Democracy);
        if (proposeEvent) {
            const proposal_index = JSON.parse(JSON.stringify(proposeEvent.data))[0];
            const proposal = await proposalRepository.getByProposalIndexAndChainIdAndType(proposal_index, chain.id, ProposalType.Democracy);
            if (!proposal) {
                const proposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposal_index,
                    status: ProposalStatus.Proposed,
                    proposed_at: blockEntity.id,
                    motion_hash: proposalHash,
                    modified_at: blockEntity.id,
                    type: ProposalType.Democracy
                };
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                proposalEntity.proposed_by = account.id;
                await proposalRepository.insert(proposalEntity);
            } else {
                proposal.proposed_at = blockEntity.id;
                proposal.motion_hash = proposalHash;
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                proposal.proposed_by = account.id;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, proposal.modified_at)) {
                    proposal.status = ProposalStatus.Proposed;
                    proposal.modified_at = blockEntity.id;
                }
                await proposalRepository.update(proposal);
            }
        }
    },

    /*
    * This function parses the democracy second extrinsic and creates or updates the corresponding entities in the database. (proposal, endorsement)
    */
    async parseDemocracySecond(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity): Promise<void> {

        const secondEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Seconded && e.section === EventSection.Democracy);
        if (secondEvent) {
            const endorsement = <EndorsementEntity>{};
            const address = JSON.parse(JSON.stringify(secondEvent!.data))[0];
            const proposal_index = JSON.parse(JSON.stringify(secondEvent!.data))[1];
            endorsement.endorsed_at = blockEntity.id;
            const account = await accountRepository.getOrCreateAccount(address, chain.id);
            endorsement.endorser = account.id;

            const proposal = await proposalRepository.getByProposalIndexAndChainIdAndType(proposal_index, chain.id, ProposalType.Democracy);
            if (proposal === undefined) {
                const proposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposal_index,
                    status: ProposalStatus.Proposed,
                    modified_at: blockEntity.id,
                    type: ProposalType.Democracy
                };
                const insertedProposal = await proposalRepository.insert(proposalEntity);
                endorsement.proposal_id = insertedProposal.id;
            } else {
                endorsement.proposal_id = proposal.id;
            }

            const endorsementEntry = await endorsementRepository.getByProposalIdAndEndorser(endorsement.endorser, endorsement.proposal_id);
            if (endorsementEntry === undefined) {
                await endorsementRepository.insert(endorsement);
            }
        }
    },

    /*
    * This function parses the democracy vote extrinsic and creates or updates the corresponding entities in the database. (referendum, referendum_vote)
    */
    async parseDemocracyVote(args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const referendumIndex = args.ref_index;
        const voteInformation = JSON.parse(JSON.stringify(args.vote));
        const voter = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
        let voteDetails = <any>{};
        let vote = <ReferendumVoteEntity>{};

        if (voteInformation.Standard) {
            voteDetails = voteInformation.Standard;
            vote = <ReferendumVoteEntity>{
                referendum_id: referendumIndex,
                vote: voteDetails.vote.vote === Vote.Aye,
                voted_at: blockEntity.id,
                locked_value: parseAmount(voteDetails.balance, chain),
            }

            if (voteDetails.vote.conviction === "None") vote.conviction = 0.1;
            else {
                vote.conviction = parseFloat(voteDetails.vote.conviction.replace(/[^0-9.]/g, ""));
            }

        } else {
            voteDetails = voteInformation;
            vote = <ReferendumVoteEntity>{
                referendum_id: referendumIndex,
                vote: voteDetails.vote === Vote.Aye,
                voted_at: blockEntity.id,
                locked_value: 0,
                conviction: 0.1
            };
        }

        vote.voter = voter.id;

        const referendum = await referendumRepository.getByReferendumIndexAndChainId(vote.referendum_id, chain.id);
        if (referendum === undefined) {
            const referendumEntity = <ReferendumEntity>{
                referendum_index: vote.referendum_id,
                chain_id: chain.id,
                modified_at: blockEntity.id
            };
            const insertedReferendum = await referendumRepository.insert(referendumEntity);
            vote.referendum_id = insertedReferendum.id;
        }
        else {
            vote.referendum_id = referendum.id;
        }

        const voteEntry = await referendumVoteRepository.getByVoterAndReferendumId(vote.voter, vote.referendum_id);
        if (voteEntry === undefined) {
            await referendumVoteRepository.insert(vote);
        }
    },

    /*
    * This function parses the technicalCommittee close extrinsic and creates or updates the corresponding entities in the database. (referendum, proposal)
    */
    async parseTechnicalCommitteeClose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity): Promise<void> {
        const democracyStartedEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Started && e.section === EventSection.Democracy);
        const technicalCommitteeEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.TechnicalCommittee);
        const technicalCommitteeCloseEvent = technicalCommitteeEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Closed && e.section === EventSection.TechnicalCommittee);
        const technicalCommitteeHash = JSON.parse(JSON.stringify(technicalCommitteeCloseEvent!.data))[0];
        const technicalCommitteeIndex = args.index;
        let proposal = await proposalRepository.getByProposalIndexAndChainIdAndType(technicalCommitteeIndex, chain.id, ProposalType.TechnicalCommittee);
        let technicalCommitteeStatus = <string>{};

        technicalCommitteeEvents.map(async (event: Record<string, AnyJson>) => {
            if (event.method === EventMethod.Approved) {
                technicalCommitteeStatus = ProposalStatus.Approved;
            } else if (event.method === EventMethod.Disapproved) {
                technicalCommitteeStatus = ProposalStatus.Disapproved;
            }
            if (event.method === EventMethod.Executed) {
                technicalCommitteeStatus = ProposalStatus.Executed;
            }
        });

        if (proposal) {
            proposal.motion_hash = technicalCommitteeHash;
            proposal.type = ProposalType.TechnicalCommittee;
            proposal.status = technicalCommitteeStatus;
            proposal.modified_at = blockEntity.id;
            await proposalRepository.update(proposal);
        } else {
            const proposalEntity = <ProposalEntity>{
                chain_id: chain.id,
                proposal_index: technicalCommitteeIndex,
                status: technicalCommitteeStatus,
                modified_at: blockEntity.id,
                type: ProposalType.TechnicalCommittee,
                motion_hash: technicalCommitteeHash
            };
            proposal = await proposalRepository.insert(proposalEntity);
        }

        if (democracyStartedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyStartedEvent.data))[0];
            const voteThreshold = JSON.parse(JSON.stringify(democracyStartedEvent.data))[1];

            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    chain_id: chain.id,
                    referendum_index: referendum_index,
                    vote_threshold: voteThreshold,
                    status: ReferendumStatus.Started,
                    started_at: blockEntity.id,
                    modified_at: blockEntity.id,
                    proposal_id: proposal.id
                };
                await referendumRepository.insert(referendumEntity);
            } else {
                referendum.started_at = blockEntity.id;
                referendum.vote_threshold = voteThreshold;
                referendum.proposal_id = proposal.id;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, referendum.modified_at)) {
                    referendum.status = ReferendumStatus.Started;
                    referendum.modified_at = blockEntity.id;
                }
                await referendumRepository.update(referendum);
            }
        }
    },

    /*
    * This function parses the technicalCommittee propose extrinsic and creates or updates the corresponding entities in the database. (proposal)
    */
    async parseTechnicalCommitteePropose(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const technicalCommitteeProposedEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.TechnicalCommittee);
        if (technicalCommitteeProposedEvent) {
            const proposalHash = JSON.parse(JSON.stringify(technicalCommitteeProposedEvent.data))[2];
            const proposalIndex = JSON.parse(JSON.stringify(technicalCommitteeProposedEvent.data))[1];
            const proposal = await proposalRepository.getByProposalIndexAndChainIdAndType(proposalIndex, chain.id, ProposalType.TechnicalCommittee);
            const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

            if (!proposal) {
                const proposalEntity: ProposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposalIndex,
                    motion_hash: proposalHash,
                    proposed_at: blockEntity.id,
                    proposed_by: account.id,
                    status: ProposalStatus.Proposed,
                    modified_at: blockEntity.id,
                    type: ProposalType.TechnicalCommittee
                };
                await proposalRepository.insert(proposalEntity);
            } else if (proposal) {
                proposal.proposed_at = blockEntity.id;
                proposal.proposed_by = account.id;
                proposal.proposal_index = proposalIndex;
                if (await blockRepository.hasHigherBlockNumber(blockEntity.id, proposal.modified_at)) {
                    proposal.status = ProposalStatus.Proposed;
                    proposal.modified_at = blockEntity.id;
                }
                await proposalRepository.update(proposal);
            }
        }
    }
};