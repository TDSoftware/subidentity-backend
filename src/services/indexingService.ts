import { EndorsementEntity } from "./../types/entities/EndorsementEntity";
import { TipProposalStatus } from "./../types/enums/TipProposalStatus";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { SignedBlock } from "@polkadot/types/interfaces";
import { blockRepository } from "../repositories/blockRepository";
import { ChainEntity } from "../types/entities/ChainEntity";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";
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
import { CouncilMotionStatus } from "../types/enums/CouncilMotionStatus";
import { BountyStatus } from "../types/enums/BountyStatus";
import { TreasuryProposalStatus } from "../types/enums/TreasuryProposalStatus";
import { EventSection } from "../types/enums/EventSection";
import { EventMethod } from "../types/enums/EventMethod";
import { BlockEntity } from "../types/entities/BlockEntity";
import { CounciltermEntity } from "../types/entities/CounciltermEntity";
import { Vec } from "@polkadot/types";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { AnyJson } from "@polkadot/types-codec/types";
import { counciltermRepository } from "../repositories/counciltermRepository";
import { CouncilorEntity } from "../types/entities/CouncilorEntity";
import { councilorRepository } from "../repositories/councilorRepository";
import { TipProposalEntity } from "../types/entities/TipProposalEntity";
import { tipProposalRepository } from "../repositories/tipProposalRepository";
import { proposalRepository } from "../repositories/proposalRepository";
import { ProposalEntity } from "../types/entities/ProposalEntity";
import { ProposalStatus } from "../types/enums/ProposalStatus";
import { TipEntity } from "../types/entities/TipEntity";
import { tipRepository } from "../repositories/tipRepository";
import { ExtrinsicPhase } from "../types/enums/ExtrinsicPhase";
import { endorsementRepository } from "../repositories/endorsementRepository";
import { ReferendumVoteEntity } from "../types/entities/ReferendumVoteEntity";
import { referendumVoteRepository } from "../repositories/referendumVoteRepository";
import { referendumRepository } from "../repositories/referendumRepository";
import { ReferendumEntity } from "../types/entities/ReferendumEntity";
import { ReferendumStatus } from "../types/enums/ReferendumStatus";
import { Vote } from "../types/enums/Vote";
import { BountyMethod } from "../types/enums/BountyMethod";

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
        await indexingService.parseExtrinsic(block, blockHash);
    },

    async indexChain(wsProviderAddress: string, from: number, to: number): Promise<void> {
        console.log("Indexing start: " + new Date());
        chain = await chainService.getChainEntityByWsProvider(wsProviderAddress);
        wsProvider = new WsProvider(wsProviderAddress);
        api = await ApiPromise.create({ provider: wsProvider });
        const startHash = await api.rpc.chain.getBlockHash(from);
        indexingService.readBlock(startHash.toString(), to);
    },

    //TODO define extrinsic.method to use in combination with extrinsicSigner instead of just extrinsic (for utility batch calls)

    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        const apiAt = await api.at(blockHash);
        const extrinsics = block.block.extrinsics;
        const blockEvents = await apiAt.query.system.events();
        let blockEntity = <BlockEntity>{};

        if (await blockRepository.existsByBlockHash(blockHash)) return;
        else blockEntity = await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id));

        extrinsics.forEach(async (ex: any, index: number) => {
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

            switch (extrinsicSection) {
                case (ExtrinsicSection.COUNCIL):
                    if (extrinsicMethod === ExtrinsicMethod.VOTE) this.parseCouncilVote(ex, args, blockEntity, chain, extrinsicSigner);
                    if (extrinsicMethod === ExtrinsicMethod.CLOSE) this.parseCouncilClose(extrinsicEvents, args, blockEntity);
                    if (extrinsicMethod === ExtrinsicMethod.PROPOSE) this.parseCouncilPropose(extrinsicEvents, args, blockEntity, extrinsicSigner);
                    break;
                case (ExtrinsicSection.BOUNTIES):
                    if (extrinsicMethod === ExtrinsicMethod.PROPOSEBOUNTY) this.parseProposeBounty(extrinsicEvents, args, blockEntity, extrinsicSigner);
                    if (extrinsicMethod === ExtrinsicMethod.CLAIMBOUNTY) this.parseClaimBounty(extrinsicEvents);
                    break;
                case (ExtrinsicSection.TREASURY):
                    if (extrinsicMethod === ExtrinsicMethod.PROPOSESPEND) this.parseTreasuryProposeSpend(extrinsicEvents, args, blockEntity, extrinsicSigner);
                    break;
                case (ExtrinsicSection.TIMESTAMP):
                    if (extrinsicMethod === ExtrinsicMethod.SET) this.parseTimestampSet(blockEvents, blockEntity);
                    break;
                case (ExtrinsicSection.MULTISIG):
                    if (extrinsicMethod === ExtrinsicMethod.ASMULTI) this.parseClaimBounty(extrinsicEvents);
                    break;
                case (ExtrinsicSection.DEMOCRACY):
                    if (extrinsicMethod === ExtrinsicMethod.PROPOSE) this.parseDemocracyPropose(extrinsicEvents, args, extrinsic, blockEntity, extrinsicSigner);
                    if (extrinsicMethod === ExtrinsicMethod.SECOND) this.parseDemocracySecond(extrinsicEvents, blockEntity);
                    if (extrinsicMethod === ExtrinsicMethod.VOTE) this.parseDemocracyVote(extrinsicEvents, args, extrinsic, blockEntity, extrinsicSigner);
                    break;
                case (ExtrinsicSection.TIPS):
                    this.parseTipExtrinsics(extrinsicEvents, extrinsicMethod, ex, args, blockEntity, extrinsicSigner);
                    break;
            }
        });
    },

    async parseCouncilClose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity): Promise<void> {
        const motionHash = args.proposal_hash;
        const index = Number(args.index);
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash);
        const councilEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Council);
        const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{
            motion_hash: motionHash,
            proposal_index: index,
            to_block: blockEntity.id,
            chain_id: chain.id
        };
        const councilEventMethod = councilEvents.map((ev: Record<string, AnyJson>) => ev.method);

        if (councilEventMethod.some((ev: AnyJson) => ev === "Approved")) {
            councilMotion.status = CouncilMotionStatus.Approved;
        } else if (councilEventMethod.some((ev: AnyJson) => ev === "Rejected")) {
            councilMotion.status = CouncilMotionStatus.Rejected;
        } else if (councilEventMethod.some((ev: AnyJson) => ev === "Disapproved")) {
            councilMotion.status = CouncilMotionStatus.Disapproved;
        }

        if (!councilMotionEntry) {
            councilMotionRepository.insert(councilMotion);
        } else if (councilMotionEntry) {
            councilMotionRepository.update(councilMotion);
        }

        const bountyEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Bounties);

        bountyEvents.forEach(async (be: Record<string, AnyJson>) => {
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
        });
    },

    async parseCouncilPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const proposal = args.proposal;
        const proposalMethod = proposal.method;
        const proposalSection = proposal.section;
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Proposed && e.section === EventSection.Council);
        const proposalIndex = JSON.parse(JSON.stringify(proposeEvent)).data[1];
        const councilMotionHash = JSON.parse(JSON.stringify(proposeEvent)).data[2];
        let councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash);
        const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);

        if (councilMotionEntry) {
            councilMotionEntry.method = proposalMethod;
            councilMotionEntry.section = proposalSection;
            councilMotionEntry.proposal_index = proposalIndex;
            councilMotionEntry.proposed_by = proposer.id;
            councilMotionEntry.from_block = blockEntity.id;
            await councilMotionRepository.update(councilMotionEntry);
        } else if (!councilMotionEntry) {
            const councilMotion = <CouncilMotionEntity>{};
            councilMotion.chain_id = chain.id;
            councilMotion.motion_hash = councilMotionHash;
            councilMotion.method = proposalMethod;
            councilMotion.section = proposalSection;
            councilMotion.proposal_index = proposalIndex;
            councilMotion.status = CouncilMotionStatus.Proposed;
            councilMotion.proposed_by = proposer.id;
            councilMotion.from_block = blockEntity.id;
            councilMotionEntry = await councilMotionRepository.insert(councilMotion);
        }

        if (proposalMethod === ExtrinsicMethod.APPROVEPROPOSAL && proposalSection === ExtrinsicSection.TREASURY) {
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
        bountiesProposedEvents.forEach(async (bpe: Record<string, AnyJson>) => {
            const bountyId = JSON.parse(JSON.stringify(bpe.data))[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);
            let entry: BountyEntity = <BountyEntity>{};
            entry.status = BountyStatus.Proposed;

            if (bountyEntry) {
                entry = bountyEntry;
            }

            entry.bounty_id = bountyId;
            entry.description = String(args.description);
            entry.value = Number(args[0]);
            entry.chain_id = chain.id;
            const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
            entry.proposed_by = proposer.id;
            entry.proposed_at = blockEntity.id;

            if (bountyEntry) {
                bountyRepository.update(entry);
            } else {
                bountyRepository.insert(entry);
            }
        });
    },

    async parseTreasuryProposeSpend(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const treasuryProposedEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section === EventSection.Treasury && e.method === EventMethod.Proposed);
        treasuryProposedEvents.forEach(async (tpe: Record<string, AnyJson>) => {
            const proposalId = JSON.parse(JSON.stringify(tpe.data))[0];
            const entryList = await treasureProposalRepository.getByProposalIdAndChainId(proposalId, chain.id);
            if (entryList) {
                const entry = entryList;
                entry.value = Number(args[0]);
                const proposer = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                entry.proposed_by = proposer.id;
                entry.proposed_at = blockEntity.id;
                treasureProposalRepository.update(entry);
            }
        });
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
                const proposalEntity: ProposalEntity = <ProposalEntity>{};
                proposalEntity.proposal_index = proposalIndex;
                proposalEntity.status = ProposalStatus.Tabled;
                proposalEntity.chain_id = chain.id;
                proposalEntity.proposed_at = blockEntity.id;
                proposalEntity.proposal_index = proposalIndex;
                await proposalRepository.insert(proposalEntity);
            } else {
                proposal.status = ProposalStatus.Tabled;
                proposal.chain_id = chain.id;
                proposal.proposed_at = blockEntity.id;
                proposal.proposal_index = proposalIndex;
                await proposalRepository.update(proposal);
            }
        }

        if (newCounciltermEvent) {
            const councilterm = <CounciltermEntity>{};
            councilterm.from_block = blockEntity.id;
            const counciltermInsert = await counciltermRepository.insert(councilterm);
            const counciltermData = Array(newCounciltermEvent.data).flat().flat();
            counciltermData.forEach(async (ctd: AnyJson) => {
                const councilorEntity = <CouncilorEntity>{};
                const address = String(Array(ctd).flat()[0]);
                councilorEntity.councilterm_id = counciltermInsert.id;
                const account = await accountRepository.getOrCreateAccount(address, chain.id);
                councilorEntity.account_id = account.id;
                await councilorRepository.insert(councilorEntity);
            });
        }

        if (treasuryEvents) {
            treasuryEvents.forEach(async (te: Record<string, AnyJson>) => {
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
            });
        }
    },

    async parseClaimBounty(extrinsicEvents: Record<string, AnyJson>[]): Promise<void> {
        const claimedEvents = extrinsicEvents.filter(
            (ev: Record<string, AnyJson>) =>
                ev.section === EventSection.Bounties &&
                ev.method === EventMethod.BountyClaimed
        );
        if (claimedEvents) {
            claimedEvents.forEach((ce: Record<string, AnyJson>) => {
                const claimEventData = JSON.parse(JSON.stringify(ce.data));
                const bounty = <BountyEntity>{
                    bounty_id: claimEventData[0],
                    status: BountyStatus.Claimed,
                    chain_id: chain.id
                };
                bountyRepository.insert(bounty);
            });
        }
    },

    async parseCouncilVote(ex: any, args: any, blockEntity: BlockEntity, chain: ChainEntity, extrinsicSigner: string): Promise<void> {
        const motionHash = args.proposal;
        const voteApproved = args.approve;
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash);
        const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
        let councilMotionId = <number>{};
        let existingVote = <any>{};
        if (councilMotionEntry) councilMotionId = councilMotionEntry.id;
        else {
            const councilMotionEntry = <CouncilMotionEntity>{};
            councilMotionEntry.chain_id = chain.id;
            councilMotionEntry.motion_hash = motionHash;
            const entry = await councilMotionRepository.insert(councilMotionEntry);
            councilMotionId = entry.id;
        }
        existingVote = await councilMotionVoteRepository.getByCouncilMotionIdAndAccountId(councilMotionId, account.id);
        if (!existingVote) {
            const approved = voteApproved;
            const vote: CouncilMotionVoteEntity = <CouncilMotionVoteEntity>{};
            vote.account_id = account.id;
            vote.council_motion_id = councilMotionId;
            vote.approved = approved;
            vote.block = blockEntity.id;
            councilMotionVoteRepository.insert(vote);
        }
    },

    async parseTipExtrinsics(extrinsicEvents: Record<string, AnyJson>[], extrinsicMethod: any, extrinsic: any, args: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
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
                const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                const tipProposalEntry = await tipProposalRepository.getByMotionHashAndChainId(motionHash, chain.id);
                if (!tipProposalEntry) {
                    const tipProposal = <TipProposalEntity>{
                        motion_hash: motionHash,
                        chain_id: chain.id,
                        status: TipProposalStatus.Closed,
                        value: JSON.parse(JSON.stringify(tipEvent!.data))[2]
                    };
                    tipProposalRepository.insert(tipProposal);
                } else if (tipProposalEntry) {
                    tipProposalEntry.status = TipProposalStatus.Closed;
                    tipProposalEntry.value = JSON.parse(JSON.stringify(tipEvent!.data))[2];
                    tipProposalEntry.chain_id = chain.id;
                    await tipProposalRepository.update(tipProposalEntry);
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
                    };
                    const insertedTipProposal = await tipProposalRepository.insert(tipProposal);
                    tip.tip_proposal_id = insertedTipProposal.id;
                }
                const account = await accountRepository.getOrCreateAccount(extrinsicSigner, chain.id);
                tip.tipper = account.id;
                tip.value = parseInt(args.tip_value);
                tip.tipped_at = blockEntity.id;
                await tipRepository.insert(tip);
                break;
            }
        }
    },

    /*
        handles democracy propose calls
    */
    async parseDemocracyPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, extrinsic: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
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
       this function is called to parse the endorsals/ seconds for proposals
    */
    async parseDemocracySecond(extrinsicEvents: Record<string, AnyJson>[], blockEntity: BlockEntity): Promise<void> {
        const secondEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Seconded && e.section === EventSection.Democracy);
        const endorsement = <EndorsementEntity>{};
        const address = JSON.parse(JSON.stringify(secondEvent!.data))[0];
        const proposal_index = JSON.parse(JSON.stringify(secondEvent!.data))[1];
        endorsement.endorsed_at = blockEntity.id;

        const account = await accountRepository.getOrCreateAccount(address, chain.id);
        endorsement.endorser = account.id;

        const proposal = await proposalRepository.getByProposalIndexAndChainId(proposal_index, chain.id);
        if (proposal === undefined) {
            const proposalEntity = <ProposalEntity>{};
            proposalEntity.proposal_index = proposal_index;
            proposalEntity.chain_id = chain.id;
            proposalEntity.status = ProposalStatus.Proposed;
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
    },

    /*
        handles democracy votes
    */
    async parseDemocracyVote(extrinsicEvents: Record<string, AnyJson>[], args: any, extrinsic: any, blockEntity: BlockEntity, extrinsicSigner: string): Promise<void> {
        const voteEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method === EventMethod.Voted && e.section === EventSection.Democracy);
        if (voteEvent) {
            const voteDetails = JSON.parse(JSON.stringify(voteEvent!.data))[2].Standard;
            const vote = <ReferendumVoteEntity>{
                referendum_id: JSON.parse(JSON.stringify(voteEvent.data))[1],
                vote: voteDetails.vote.vote == Vote.Aye,
                locked_value: parseInt(voteDetails.balance),
                voted_at: blockEntity.id
            };

            // getting the conviction from the string of the response
            if (voteDetails.vote.conviction == "None") vote.conviction = 0.1;
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
            else {
                await referendumVoteRepository.update(vote);
            }
        }
    }
};