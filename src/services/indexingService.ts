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
import { Vec } from "@polkadot/types";
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
import { treasureProposalRepository } from "../repositories/treasuryProposalRepository";

let chain: ChainEntity;
let wsProvider: WsProvider;
let api: ApiPromise;

export const indexingService = {

    async readBlock(blockHash: string, from: number, to: number): Promise<void> {
        const block = await api.rpc.chain.getBlock(blockHash);
        if (block.block.header.number.toNumber() >= to) indexingService.readBlock(block.block.header.parentHash.toString(), from, to);
        else {
            console.log(new Date());
            return;
        }
        indexingService.parseBlock(block, blockHash);
    },

    async parseBlock(block: SignedBlock, blockHash: string): Promise<void> {
        await indexingService.parseExtrinsic(block, blockHash);
    },

    async indexChain(wsProviderAddress: string, from: number, to: number): Promise<void> {
        console.log("Indexing start: " + new Date() + " from: " + from + " to: " + to);
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });
        const startHash = await api.rpc.chain.getBlockHash(from);
        indexingService.readBlock(startHash.toString(), from, to);
    },

    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        // console.time("BLOCK: " + block.block.header.number.toNumber());
        const apiAt = await api.at(blockHash);
        const extrinsics = block.block.extrinsics;
        const blockEvents = await apiAt.query.system.events();
        let blockEntity = <BlockEntity>{};

        if (await blockRepository.existsByBlockHash(blockHash)) return;
        else blockEntity = await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id));

        for (let index = 0; index < extrinsics.length; index++) {
            const ex = extrinsics[index];
            let extrinsic = JSON.parse(JSON.stringify(ex.toHuman()));
            let extrinsicMethod = extrinsic.method.method;
            let extrinsicSection = extrinsic.method.section;
            let extrinsicSigner: string;
            let args: any;

            if (ex.signer) {
                extrinsicSigner = ex.signer.toString();
            } else extrinsicSigner = "None";

            const extrinsicEvents = blockEvents.filter((e: FrameSystemEventRecord) => e.phase.toString() != ExtrinsicPhase.INITIALIZATION && e.phase.toString() != ExtrinsicPhase.FINALIZATION && e.phase.asApplyExtrinsic.toNumber() === index).map((ev: FrameSystemEventRecord) => ev.event.toHuman());
            if (extrinsicEvents.some((ev: Record<string, AnyJson>) => ev.section === EventSection.System && ev.method === EventMethod.ExtrinsicFailed)) return;

            if (extrinsicSection === ExtrinsicSection.PROXY && extrinsicMethod === ExtrinsicMethod.PROXY) {
                extrinsic = extrinsic.method.args.call;
                if (extrinsic) {
                    extrinsicMethod = extrinsic.method;
                    extrinsicSection = extrinsic.section;
                    args = extrinsic.args;
                }
            } else args = extrinsic.method.args;

            await this.parseMethodAndSection(extrinsicSection, extrinsicMethod, extrinsic, extrinsicEvents, blockEvents, args, blockEntity, extrinsicSigner);
        }
        // console.timeEnd("BLOCK: " + block.block.header.number.toNumber());
    },

    async parseMethodAndSection(extrinsicSection: string, extrinsicMethod: string, extrinsic: any, extrinsicEvents: Record<string, AnyJson>[], blockEvents: Vec<FrameSystemEventRecord>, args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        switch (extrinsicSection) {
            case (ExtrinsicSection.COUNCIL):
                if (extrinsicMethod === ExtrinsicMethod.VOTE) await this.parseCouncilVote(args, blockEntity, chain, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.CLOSE) await this.parseCouncilClose(extrinsicEvents, args, blockEntity);
                if (extrinsicMethod === ExtrinsicMethod.PROPOSE) await this.parseCouncilPropose(extrinsicEvents, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.BOUNTIES):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSEBOUNTY) await this.parseProposeBounty(extrinsicEvents, args, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.CLAIMBOUNTY) await this.parseClaimBounty(extrinsicEvents);
                break;
            case (ExtrinsicSection.TREASURY):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSESPEND) await this.parseTreasuryProposeSpend(extrinsicEvents, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.TIMESTAMP):
                if (extrinsicMethod === ExtrinsicMethod.SET) await this.parseTimestampSet(blockEvents, blockEntity);
                break;
            case (ExtrinsicSection.MULTISIG):
                if (extrinsicMethod === ExtrinsicMethod.ASMULTI) await this.parseClaimBounty(extrinsicEvents);
                break;
            case (ExtrinsicSection.DEMOCRACY):
                if (extrinsicMethod === ExtrinsicMethod.PROPOSE) await this.parseDemocracyPropose(extrinsicEvents, args, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.SECOND) await this.parseDemocracySecond(extrinsicEvents, blockEntity, extrinsic);
                if (extrinsicMethod === ExtrinsicMethod.VOTE) await this.parseDemocracyVote(extrinsicEvents, blockEntity, extrinsicSigner);
                if (extrinsicMethod === ExtrinsicMethod.NOTEPREIMAGE) await this.parseDemocracyPreimageNoted(extrinsicEvents, args, blockEntity, extrinsic, extrinsicSigner);
                break;
            case (ExtrinsicSection.TIPS):
                await this.parseTipExtrinsics(extrinsicEvents, extrinsicMethod, args, blockEntity, extrinsicSigner);
                break;
            case (ExtrinsicSection.UTILITY):
                if (extrinsicMethod === ExtrinsicMethod.BATCH) this.parseUtilityBatch(extrinsicEvents, extrinsic, args, blockEvents, blockEntity, extrinsicSigner);
                break;
        }
    },

    parseUtilityBatch(extrinsicEvents: Record<string, AnyJson>[], extrinsic: any, args: any, blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity, extrinsicSigner: string): void {
        for (let index = 0; index < args.calls.length; index++) {
            const call = args.calls[index];
            this.parseMethodAndSection(call.section, call.method, extrinsic, extrinsicEvents, blockEvents, call.args, blockEntity, extrinsicSigner);
        }
    },

    async parseCouncilClose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity): Promise<void> {
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(args.proposal_hash);
        const councilEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Council);
        const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{
            motion_hash: args.proposal_hash,
            proposal_index: Number(args.index),
            to_block: blockEntity.id,
            chain_id: chain.id
        };
        const councilEventMethod = councilEvents.map((ev: Record<string, AnyJson>) => ev.method);

        if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Approved)) {
            councilMotion.status = CouncilMotionStatus.Approved;
        } else if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Rejected)) {
            councilMotion.status = CouncilMotionStatus.Rejected;
        } else if (councilEventMethod.some((ev: AnyJson) => ev === EventMethod.Disapproved)) {
            councilMotion.status = CouncilMotionStatus.Disapproved;
        }

        if (!councilMotionEntry) {
            councilMotionRepository.insert(councilMotion);
        } else if (councilMotionEntry) {
            councilMotionRepository.update(councilMotion);
        }

        const bountyEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Bounties);

        for (let index = 0; index < bountyEvents.length; index++) {
            const be = bountyEvents[index];
            const bountyEvent = JSON.parse(JSON.stringify(be));
            const bountyId = bountyEvent.data[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);

            if (!bountyEntry) {
                const bounty: BountyEntity = <BountyEntity>{
                    chain_id: chain.id,
                    bounty_id: bountyId
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
                bountyRepository.insert(bounty);
            }
        }
    },

    async parseCouncilPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const proposal = args.proposal;
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.Council);
        const proposalIndex = JSON.parse(JSON.stringify(proposeEvent)).data[1];
        const councilMotionHash = JSON.parse(JSON.stringify(proposeEvent)).data[2];
        let councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash);
        const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

        if (councilMotionEntry) {
            councilMotionEntry.method = proposal.method;
            councilMotionEntry.section = proposal.section;
            councilMotionEntry.proposal_index = proposalIndex;
            councilMotionEntry.proposed_by = proposer.id;
            councilMotionEntry.from_block = blockEntity.id;
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
                status: CouncilMotionStatus.Proposed
            };
            councilMotionEntry = await councilMotionRepository.insert(councilMotion);
        }

        if (proposal.method === ExtrinsicMethod.APPROVEPROPOSAL && proposal.section === ExtrinsicSection.TREASURY) {
            const proposalID = proposal.args.proposal_id;
            const proposalEntry = await treasureProposalRepository.getByProposalIdAndChainId(proposalID, chain.id);
            councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash);

            if (proposalEntry) {
                if (councilMotionEntry) {
                    proposalEntry.council_motion_id = councilMotionEntry.id;
                    await treasureProposalRepository.update(proposalEntry);
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

                if (councilMotionEntry) {
                    treasuryProposal.council_motion_id = councilMotionEntry.id;
                }

                treasureProposalRepository.insert(treasuryProposal);
            }
        }
    },

    async parseProposeBounty(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const bountiesProposedEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Bounties && e.method === EventMethod.BountyProposed);
        for (let index = 0; index < bountiesProposedEvents.length; index++) {
            const bpe = bountiesProposedEvents[index];
            const bountyId = JSON.parse(JSON.stringify(bpe.data))[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);
            let entry: BountyEntity = <BountyEntity>{};
            entry.status = BountyStatus.Proposed;

            if (bountyEntry) {
                entry = bountyEntry;
            }

            entry.bounty_id = bountyId;
            entry.description = String(args.description);
            entry.value = parseFloat(args.value.replace(/,/g, ""));
            entry.chain_id = chain.id;
            const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
            entry.proposed_by = proposer.id;
            entry.proposed_at = blockEntity.id;

            if (bountyEntry) {
                bountyRepository.update(entry);
            } else {
                bountyRepository.insert(entry);
            }
        }
    },

    async parseTreasuryProposeSpend(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const treasuryProposedEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Treasury && e.method === EventMethod.Proposed);
        for (let index = 0; index < treasuryProposedEvents.length; index++) {
            const tpe = treasuryProposedEvents[index];
            const proposalId = JSON.parse(JSON.stringify(tpe.data))[0];
            const entryList = await treasureProposalRepository.getByProposalIdAndChainId(proposalId, chain.id);
            if (entryList) {
                const entry = entryList;
                entry.value = parseFloat(args.value.replace(/,/g, ""));
                const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                entry.proposed_by = proposer.id;
                entry.proposed_at = blockEntity.id;
                treasureProposalRepository.update(entry);
            }
        }
    },

    async parseTimestampSet(blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity): Promise<void> {
        const initializationEvents = blockEvents.filter((e: any) => e.phase.toString() === ExtrinsicPhase.INITIALIZATION).map((ev: FrameSystemEventRecord) => ev.event.toHuman());
        const treasuryEvents = initializationEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Treasury && e.method === EventMethod.Awarded);
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

            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    chain_id: chain.id,
                    referendum_index: referendum_index,
                    vote_threshold: voteThreshold,
                    status: ReferendumStatus.Started,
                    started_at: blockEntity.id
                };
                referendumRepository.insert(referendumEntity);
            } else {
                referendum.started_at = blockEntity.id;
                referendum.vote_threshold = voteThreshold;
                referendumRepository.update(referendum);
            }
        }

        if (democracyExecutedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyExecutedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    status: ReferendumStatus.Executed,
                    ended_at: blockEntity.id
                };
                referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.Executed;
                referendum.ended_at = blockEntity.id;
                referendumRepository.update(referendum);
            }
        }

        if (democracyPassedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyPassedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    status: ReferendumStatus.Passed
                };
                referendumRepository.insert(referendumEntity);
            }
        }

        if (democracyNotPassedEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyNotPassedEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    status: ReferendumStatus.NotPassed,
                    ended_at: blockEntity.id
                };
                referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.NotPassed;
                referendum.ended_at = blockEntity.id;
                referendumRepository.update(referendum);
            }
        }

        if (democracyCancelledEvent) {
            const referendum_index = JSON.parse(JSON.stringify(democracyCancelledEvent.data))[0];
            const referendum = await referendumRepository.getByReferendumIndexAndChainId(referendum_index, chain.id);
            if (!referendum) {
                const referendumEntity: ReferendumEntity = <ReferendumEntity>{
                    referendum_index: referendum_index,
                    status: ReferendumStatus.Cancelled,
                    ended_at: blockEntity.id
                };
                referendumRepository.insert(referendumEntity);
            } else {
                referendum.status = ReferendumStatus.Cancelled;
                referendum.ended_at = blockEntity.id;
                referendumRepository.update(referendum);
            }
        }

        if (democracyTabledEvent) {
            const proposalIndex = JSON.parse(JSON.stringify(democracyTabledEvent.data))[0];
            const proposal = await proposalRepository.getByProposalIndexAndChainId(proposalIndex, chain.id);
            if (!proposal) {
                const proposalEntity: ProposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposalIndex,
                    status: ProposalStatus.Tabled
                };
                await proposalRepository.insert(proposalEntity);
            } else {
                proposal.status = ProposalStatus.Tabled;
                proposal.chain_id = chain.id;
                proposal.proposal_index = proposalIndex;
                await proposalRepository.update(proposal);
            }
        }

        if (newCounciltermEvent) {
            const councilterm = <CounciltermEntity>{};
            councilterm.from_block = blockEntity.id;
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

        if (treasuryEvents) {
            for (let i = 0; i < treasuryEvents.length; i++) {
                const te = treasuryEvents[i];
                const treasuryEvent = JSON.parse(JSON.stringify(te));
                const treasuryProposal: TreasuryProposalEntity = <TreasuryProposalEntity>{};
                const existingProposal = await treasureProposalRepository.getByProposalIdAndChainId(treasuryEvent.data[0], chain.id);
                if (!existingProposal) {
                    treasuryProposal.status = TreasuryProposalStatus.Awarded;
                    treasuryProposal.proposal_id = treasuryEvent.data[0];
                    const beneficiaryAccount = await accountRepository.getOrCreateAccount(treasuryEvent.data[2], chain.id);
                    treasuryProposal.beneficiary = beneficiaryAccount.id;
                    treasuryProposal.chain_id = chain.id;
                    treasureProposalRepository.insert(treasuryProposal);
                }
            }
        }
    },

    async parseClaimBounty(extrinsicEvents: Record<string, AnyJson>[]): Promise<void> {
        const claimedEvents = extrinsicEvents.filter(
            (ev: Record<string, AnyJson>) =>
                ev.section === EventSection.Bounties &&
                ev.method === EventMethod.BountyClaimed
        );
        if (claimedEvents) {
            for (let i = 0; i < claimedEvents.length; i++) {
                const ce = claimedEvents[i];
                const claimEventData = JSON.parse(JSON.stringify(ce.data));
                const bounty = <BountyEntity>{
                    bounty_id: claimEventData[0],
                    status: BountyStatus.Claimed,
                    chain_id: chain.id
                };
                await bountyRepository.insert(bounty);
            }
        }
    },

    async parseCouncilVote(args: any, blockEntity: BlockEntity, chain: ChainEntity, extrinsicSigner: string): Promise<void> {
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(args.proposal);
        const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
        let councilMotionId = <number>{};
        let existingVote = <any>{};
        if (councilMotionEntry) councilMotionId = councilMotionEntry.id;
        else {
            const councilMotionEntry = <CouncilMotionEntity>{
                motion_hash: args.proposal,
                chain_id: chain.id
            };
            const entry = await councilMotionRepository.insert(councilMotionEntry);
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
            councilMotionVoteRepository.insert(vote);
        }
    },

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
                        tipProposalEntry.reason = args.reason;
                        tipProposalEntry.chain_id = chain.id;
                        tipProposalEntry.proposed_at = blockEntity.id;
                        tipProposalEntry.motion_hash = motionHash;
                        tipProposalEntry.beneficiary = beneficiary.id;
                        tipProposalEntry.finder = finder.id;
                        await tipProposalRepository.update(tipProposalEntry);
                    } else if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{
                            reason: args.reason,
                            chain_id: chain.id,
                            proposed_at: blockEntity.id,
                            status: TipProposalStatus.Proposed,
                            motion_hash: motionHash,
                            beneficiary: beneficiary.id,
                            finder: finder.id
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
                        status: TipProposalStatus.Retracted
                    };
                    await tipProposalRepository.insert(tipProposal);
                }
                break;
            }
            case ExtrinsicMethod.CLOSETIP: {
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.TipClosed);
                if (tipEvent) {
                    const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                    const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                    if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{
                            motion_hash: motionHash,
                            chain_id: chain.id,
                            status: TipProposalStatus.Closed,
                            value: parseFloat(JSON.parse(JSON.stringify(tipEvent!.data))[2].replace(/,/g, ""))
                        };
                        tipProposalRepository.insert(tipProposal);
                    } else if (tipProposalEntry) {
                        tipProposalEntry.status = TipProposalStatus.Closed;
                        tipProposalEntry.value = parseFloat(JSON.parse(JSON.stringify(tipEvent!.data))[2].replace(/,/g, ""));
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
                        chain_id: chain.id
                    };
                    const insertedTipProposal = await tipProposalRepository.insert(tipProposal);
                    tip.tip_proposal_id = insertedTipProposal.id;
                }
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

                tip.tipper = account.id;
                tip.value = parseFloat(args.tip_value.replace(/,/g, ""));
                tip.tipped_at = blockEntity.id;
                await tipRepository.insert(tip);
                break;
            }
        }
    },

    /*
        handles democracy propose calls
    */
    async parseDemocracyPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.Democracy);
        if (proposeEvent) {
            const proposal_index = JSON.parse(JSON.stringify(proposeEvent.data))[0];
            const proposal = await proposalRepository.getByProposalIndexAndChainId(proposal_index, chain.id);
            if (!proposal) {
                const proposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposal_index,
                    status: ProposalStatus.Proposed,
                    proposed_at: blockEntity.id,
                    motion_hash: JSON.parse(JSON.stringify(args.proposal_hash))
                };
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                proposalEntity.proposed_by = account.id;

                await proposalRepository.insert(proposalEntity);
            } else {
                proposal.proposed_at = blockEntity.id;
                proposal.motion_hash = JSON.parse(JSON.stringify(args.proposal_hash));
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                proposal.proposed_by = account.id;
                await proposalRepository.update(proposal);
            }
        }
    },

    /*
        this function decodes the encoded_proposal and gets the call for a proposal
    */
    async parseDemocracyPreimageNoted(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsic: any, extrinsicSigner: string): Promise<void> {
        const preImageEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.PreimageNoted && e.section === EventSection.Democracy);
        if (preImageEvent) {
            const encoded_proposal = args.encoded_proposal.toString();
            const decoded_proposal = api.createType("Proposal", encoded_proposal).toHuman();
            const preImageMethod = decoded_proposal.method;
            const preImageSection = decoded_proposal.section;
            const proposal_hash = JSON.parse(JSON.stringify(preImageEvent.data))[0];
            const account = await accountRepository.getOrCreateAccount(JSON.parse(JSON.stringify(preImageEvent.data))[1], chain.id);
            const proposal = await proposalRepository.getByMotionHashAndChainId(proposal_hash, chain.id)
            if (proposal) {
                proposal.section = preImageSection!.toString();
                proposal.method = preImageMethod!.toString();
                proposal.proposed_by = account.id
                proposalRepository.update(proposal)
            } else {
                const proposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    motion_hash: proposal_hash,
                    section: preImageSection,
                    method: preImageMethod,
                    proposed_by: account.id
                }
                proposalRepository.insert(proposalEntity)
            }
        }
    },

    /*
       this function is called to parse the endorsals/ seconds for proposals
    */
    async parseDemocracySecond(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity, extrinsic: any): Promise<void> {
        const secondEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Seconded && e.section === EventSection.Democracy);
        if (secondEvent) {
            const endorsement = <EndorsementEntity>{};
            const address = JSON.parse(JSON.stringify(secondEvent!.data))[0];
            const proposal_index = JSON.parse(JSON.stringify(secondEvent!.data))[1];
            endorsement.endorsed_at = blockEntity.id;
            const account = await accountRepository.getOrCreateAccount(address, chain.id);
            endorsement.endorser = account.id;

            const proposal = await proposalRepository.getByProposalIndexAndChainId(proposal_index, chain.id);
            if (proposal === undefined) {
                const proposalEntity = <ProposalEntity>{
                    chain_id: chain.id,
                    proposal_index: proposal_index,
                    status: ProposalStatus.Proposed
                };
                const insertedProposal = await proposalRepository.insert(proposalEntity);
                endorsement.proposal_id = insertedProposal.id;
            } else {
                endorsement.proposal_id = proposal.id;
            }

            const endorsementEntry = await endorsementRepository.getByProposalIdAndEndorser(endorsement.endorser, endorsement.proposal_id);
            if (endorsementEntry === undefined) {
                await endorsementRepository.insert(endorsement);
            } else {
                await endorsementRepository.update(endorsement);
            }
        }
    },

    /*
        handles democracy votes
    */
    async parseDemocracyVote(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const voteEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Voted && e.section === EventSection.Democracy);
        if (voteEvent) {
            const voteDetails = JSON.parse(JSON.stringify(voteEvent!.data))[2].Standard;
            const vote = <ReferendumVoteEntity>{
                referendum_id: JSON.parse(JSON.stringify(voteEvent.data))[1],
                vote: voteDetails.vote.vote === Vote.Aye,
                locked_value: parseFloat(voteDetails.balance.replace(/,/g, "")),
                voted_at: blockEntity.id
            };

            // getting the conviction from the string of the response
            if (voteDetails.vote.conviction === "None") vote.conviction = 0.1;
            else {
                vote.conviction = parseFloat(voteDetails.vote.conviction.replace(/[^0-9.]/g, ""));
            }

            const voter = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
            vote.voter = voter.id;

            const referendum = await referendumRepository.getByReferendumIndexAndChainId(vote.referendum_id, chain.id);
            if (referendum === undefined) {
                const referendumEntity = <ReferendumEntity>{
                    referendum_index: vote.referendum_id,
                    chain_id: chain.id
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
        }
    }
};