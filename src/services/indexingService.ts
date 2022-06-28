import { TipProposalStatus } from './../types/enums/TipProposalStatus';
import { ApiPromise, WsProvider } from "@polkadot/api";
import { SignedBlock } from "@polkadot/types/interfaces";
import { blockRepository } from "../repositories/blockRepository";
import { ChainEntity } from "../types/entities/ChainEntity";
import { CouncilMotionEntity } from "../types/entities/CouncilMotionEntity";
import { blockMapper } from "./mapper/blockMapper";
import { chainService } from "./chainService";
import { BountyEntity } from "../types/entities/BountyEntity";
import { ExtrinsicMethod } from '../types/enums/ExtrinsicMethod';
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
import { BlockEntity } from '../types/entities/BlockEntity';
import { CounciltermEntity } from "../types/entities/CounciltermEntity";
import { Vec } from "@polkadot/types";
import { FrameSystemEventRecord } from "@polkadot/types/lookup";
import { AnyJson } from "@polkadot/types-codec/types";
import { counciltermRepository } from "../repositories/counciltermRepository";
import { CouncilorEntity } from "../types/entities/CouncilorEntity";
import { councilorRepository } from "../repositories/councilorRepository";
import { TipProposalEntity } from "../types/entities/TipProposalEntity";
import { timingSafeEqual } from "crypto";
import { tipProposalRepository } from '../repositories/tipProposalRepository';

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

    async parseExtrinsic(block: SignedBlock, blockHash: string): Promise<void> {
        const apiAt = await api.at(blockHash);
        const extrinsics = block.block.extrinsics;
        const blockEvents = await apiAt.query.system.events();
        var blockEntity = <BlockEntity>{}

        if (await blockRepository.getByBlockHash(blockHash)) return;
        else blockEntity = await blockRepository.insert(blockMapper.toInsertEntity(blockHash, block.block.header.number.toNumber(), chain.id));

        extrinsics.forEach(async (ex: any, index: number) => {
            let extrinsic = JSON.parse(JSON.stringify(ex.toHuman()));
            let extrinsicMethod = extrinsic.method.method;
            let extrinsicSection = extrinsic.method.section;
            let args: any;

            const extrinsicEvents = blockEvents.filter((e: FrameSystemEventRecord) => e.phase.toString() != "Initialization" && e.phase.toString() != "Finalization" && e.phase.asApplyExtrinsic.toNumber() == index).map((ev: FrameSystemEventRecord) => ev.event.toHuman());
            if (extrinsicEvents.some((ev: Record<string, AnyJson>) => ev.section == EventSection.System && ev.method == EventMethod.ExtrinsicFailed)) return;

            if (extrinsicSection == ExtrinsicSection.PROXY && extrinsicMethod == ExtrinsicMethod.PROXY) {
                extrinsic = extrinsic.method.args.call;
                if (extrinsic) {
                    extrinsicMethod = extrinsic.method;
                    extrinsicSection = extrinsic.section;
                    args = extrinsic.args;
                }
            } else args = extrinsic.method.args;

            switch (extrinsicSection) {
                case (ExtrinsicSection.COUNCIL):
                    if (extrinsicMethod == ExtrinsicMethod.VOTE) this.parseCouncilVote(ex, args, blockEntity, chain);
                    if (extrinsicMethod == ExtrinsicMethod.CLOSE) this.parseCouncilClose(extrinsicEvents, args, blockEntity);
                    if (extrinsicMethod == ExtrinsicMethod.PROPOSE) this.parseCouncilPropose(extrinsicEvents, args, extrinsic, blockEntity);
                    break;
                case (ExtrinsicSection.BOUNTIES):
                    if (extrinsicMethod == ExtrinsicMethod.PROPOSEBOUNTY) this.parseProposeBounty(extrinsicEvents, args, ex, extrinsic, blockEntity);
                    if (extrinsicMethod == ExtrinsicMethod.CLAIMBOUNTY) this.parseClaimBounty(extrinsicEvents);
                    break;
                case (ExtrinsicSection.TREASURY):
                    if (extrinsicMethod == ExtrinsicMethod.PROPOSESPEND) this.parseTreasuryProposeSpend(extrinsicEvents, ex, blockEntity);
                    break;
                case (ExtrinsicSection.TIMESTAMP):
                    if (extrinsicMethod == ExtrinsicMethod.SET) this.parseTimestampSet(blockEvents, blockEntity);
                    break;
                case (ExtrinsicSection.MULTISIG):
                    if (extrinsicMethod == ExtrinsicMethod.ASMULTI) this.parseClaimBounty(extrinsicEvents);
                    break;
                case (ExtrinsicSection.TIPS):
                    this.parseTreasuryTip(extrinsicEvents, extrinsicMethod, ex, args, blockEntity)
                default: break;
            }
        });
    },


    async parseCouncilClose(extrinsicEvents: Record<string, AnyJson>[], args: any, blockEntity: BlockEntity): Promise<void> {
        const motionHash = args.proposal_hash;
        const index = Number(args.index);
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash);
        const councilEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section == EventSection.Council);
        const councilMotion: CouncilMotionEntity = <CouncilMotionEntity>{};
        councilMotion.motion_hash = motionHash;
        councilMotion.proposal_index = index;
        councilMotion.to_block = blockEntity.id;
        councilMotion.chain_id = chain.id;
        const councilEventMethod = councilEvents.map((ev: Record<string, AnyJson>) => ev.method);

        if (councilEventMethod.some((ev: AnyJson) => ev == "Approved")) {
            councilMotion.status = CouncilMotionStatus.Approved;
        } else if (councilEventMethod.some((ev: AnyJson) => ev == "Rejected")) {
            councilMotion.status = CouncilMotionStatus.Rejected;
        } else if (councilEventMethod.some((ev: AnyJson) => ev == "Disapproved")) {
            councilMotion.status = CouncilMotionStatus.Disapproved;
        }

        if (!councilMotionEntry) {
            councilMotionRepository.insert(councilMotion);
        } else if (councilMotionEntry) {
            councilMotionRepository.update(councilMotion);
        }

        const bountyEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section == EventSection.Bounties);

        bountyEvents.forEach(async (be: Record<string, AnyJson>) => {
            const bountyEvent = JSON.parse(JSON.stringify(be));
            const bountyId = bountyEvent.data[0];
            const bountyEntry = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);

            if (!bountyEntry) {
                const bounty: BountyEntity = <BountyEntity>{};
                switch (be.method) {
                    case "BountyRejected": {
                        bounty.status = BountyStatus.Rejected;
                        break;
                    }
                    case "BountyAwarded": {
                        bounty.status = BountyStatus.Awarded;
                        break;
                    }
                    case "BountyExtended": {
                        bounty.status = BountyStatus.Extended;
                        break;
                    }
                    case "BountyCanceled": {
                        bounty.status = BountyStatus.Cancelled;
                        break;
                    }
                }
                bounty.chain_id = chain.id;
                bounty.bounty_id = bountyId;
                bountyRepository.insert(bounty);
            }
        });
    },

    async parseCouncilPropose(extrinsicEvents: Record<string, AnyJson>[], args: any, extrinsic: any, blockEntity: BlockEntity): Promise<void> {
        const proposal = args.proposal;
        const proposalMethod = proposal.method;
        const proposalSection = proposal.section;
        const proposeEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method == EventMethod.Proposed && e.section == EventSection.Council);
        const proposalIndex = JSON.parse(JSON.stringify(proposeEvent)).data[1];
        const councilMotionHash = JSON.parse(JSON.stringify(proposeEvent)).data[2];
        let councilMotionEntry = await councilMotionRepository.getByMotionHash(councilMotionHash);
        const proposer = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id);

        if (councilMotionEntry) {
            councilMotionEntry.method = proposalMethod;
            councilMotionEntry.section = proposalSection;
            councilMotionEntry.proposal_index = proposalIndex;
            if (proposer) {
                councilMotionEntry.proposed_by = proposer.id;
            } else if (!proposer) {
                const account: AccountEntity = <AccountEntity>{};
                account.address = extrinsic.signer.Id;
                account.chain_id = chain.id;
                const newEntry = await accountRepository.insert(account);
                councilMotionEntry.proposed_by = newEntry.id;
            }
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
            if (proposer) {
                councilMotion.proposed_by = proposer.id;
            } else if (!proposer) {
                const account: AccountEntity = <AccountEntity>{};
                account.address = extrinsic.signer.Id;
                account.chain_id = chain.id;
                await accountRepository.insertOrUpdateAccount(chain.id, extrinsic.signer.Id);
                const accountEntry = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id);
                councilMotion.proposed_by = accountEntry!.id;
            }
            councilMotion.from_block = blockEntity.id;
            councilMotionEntry = await councilMotionRepository.insert(councilMotion);
        }

        if (proposalMethod == ExtrinsicMethod.APPROVEPROPOSAL && proposalSection == ExtrinsicSection.TREASURY) {
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
                if (extrinsicEvents.find((e: Record<string, AnyJson>) => e.method == EventMethod.Awarded && e.section == EventSection.Treasury)) {
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

    async parseProposeBounty(extrinsicEvents: Record<string, AnyJson>[], args: any, ex: any, extrinsic: any, blockEntity: BlockEntity): Promise<void> {
        const bountiesProposedEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section == EventSection.Bounties && e.method == EventMethod.BountyProposed);
        bountiesProposedEvents.forEach(async (bpe: Record<string, AnyJson>) => {
            const bountyId = JSON.parse(JSON.stringify(bpe.data))[0];
            const entryList = await bountyRepository.getByBountyIdAndChainId(bountyId, chain.id);
            let entry: BountyEntity = <BountyEntity>{};
            entry.status = BountyStatus.Proposed;

            if (entryList) {
                entry = entryList;
            }

            entry.bounty_id = bountyId;
            entry.description = String(args.description);
            entry.value = Number(ex.method.args[0]);
            entry.chain_id = chain.id;
            const proposer = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id);

            if (proposer) {
                entry.proposed_by = proposer.id;
            } else if (!proposer) {
                const account: AccountEntity = <AccountEntity>{};
                account.address = JSON.parse(JSON.stringify(ex.signer)).id;
                account.chain_id = chain.id;
                await accountRepository.insertOrUpdateAccount(chain.id, extrinsic.signer.Id);
                const accountEntry = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id);
                entry.proposed_by = accountEntry!.id;
            }
            entry.proposed_at = blockEntity.id;

            if (entryList) {
                bountyRepository.update(entry);
            } else {
                bountyRepository.insert(entry);
            }
        });
    },

    async parseTreasuryProposeSpend(extrinsicEvents: Record<string, AnyJson>[], ex: any, blockEntity: BlockEntity): Promise<void> {
        const treasuryProposedEvents = extrinsicEvents.filter((e: Record<string, AnyJson>) => e.section == EventSection.Treasury && e.method == EventMethod.Proposed);
        treasuryProposedEvents.forEach(async (tpe: Record<string, AnyJson>) => {
            const proposalId = JSON.parse(JSON.stringify(tpe.data))[0];
            const entryList = await treasureProposalRepository.getByProposalIdAndChainId(proposalId, chain.id);
            if (entryList) {
                const entry = entryList;
                entry.value = Number(ex.method.args[0]);
                const proposer = await accountRepository.findByAddressAndChain(JSON.parse(JSON.stringify(ex.signer)).id, chain.id);
                if (proposer) {
                    entry.proposed_by = proposer.id;
                } else {
                    const account: AccountEntity = <AccountEntity>{};
                    account.address = JSON.parse(JSON.stringify(ex.signer)).id;
                    account.chain_id = chain.id;
                    const newEntry = await accountRepository.insert(account);
                    entry.proposed_by = newEntry.id;
                }
                entry.proposed_at = blockEntity.id;
                treasureProposalRepository.update(entry);
            }
        });
    },

    async parseTimestampSet(blockEvents: Vec<FrameSystemEventRecord>, blockEntity: BlockEntity): Promise<void> {
        const initializationEvents = blockEvents.filter((e: any) => e.phase.toString() == "Initialization").map((ev: FrameSystemEventRecord) => ev.event.toHuman());
        const treasuryEvents = initializationEvents.filter((e: Record<string, AnyJson>) => e.section == EventSection.Treasury && e.method == EventMethod.Awarded);
        const newCounciltermEvent = initializationEvents.find((e: Record<string, AnyJson>) => e.section == EventSection.PhragmenElection && e.method == EventMethod.NewTerm);

        if (newCounciltermEvent) {
            //TODO implement to_block, discuss how to handle this the best way
            const councilterm = <CounciltermEntity>{};
            councilterm.from_block = blockEntity.id;
            const counciltermInsert = await counciltermRepository.insert(councilterm);
            const counciltermData = Array(newCounciltermEvent.data).flat().flat();
            counciltermData.forEach(async (ctd: AnyJson) => {
                const councilorEntity = <CouncilorEntity>{};
                const address = String(Array(ctd).flat()[0]);
                councilorEntity.councilterm_id = counciltermInsert.id;
                const account = await accountRepository.findByAddressAndChain(address, chain.id);
                if (account) councilorEntity.account_id = account.id;
                else {
                    const newAccount = <AccountEntity>{};
                    newAccount.chain_id = chain.id;
                    newAccount.address = address;
                    const accountEntry = await accountRepository.insert(newAccount);
                    councilorEntity.account_id = accountEntry.id;
                }
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
                    const beneficiaryAccount = await accountRepository.findByAddressAndChain(treasuryEvent.data[2], chain.id);

                    if (beneficiaryAccount) {
                        treasuryProposal.beneficiary = beneficiaryAccount.id;
                    } else {
                        const account: AccountEntity = <AccountEntity>{};
                        account.address = treasuryEvent.data[2];
                        account.chain_id = chain.id;
                        const accountEntry = await accountRepository.insert(account);
                        treasuryProposal.beneficiary = accountEntry.id;
                    }
                    treasuryProposal.chain_id = chain.id;
                    treasureProposalRepository.insert(treasuryProposal);
                }
            });
        }
    },

    async parseClaimBounty(extrinsicEvents: Record<string, AnyJson>[]): Promise<void> {
        const claimedEvents = extrinsicEvents.filter(
            (ev: Record<string, AnyJson>) =>
                ev.section == EventSection.Bounties &&
                ev.method == EventMethod.BountyClaimed
        );
        if (claimedEvents) {
            claimedEvents.forEach((ce: Record<string, AnyJson>) => {
                const claimEventData = JSON.parse(JSON.stringify(ce.data));
                const bounty = <BountyEntity>{};
                bounty.bounty_id = claimEventData[0];
                bounty.status = BountyStatus.Claimed;
                bounty.chain_id = chain.id;
                bountyRepository.insert(bounty);
            });
        }
    },

    async parseCouncilVote(ex: any, args: any, blockEntity: BlockEntity, chain: ChainEntity): Promise<void> {
        const accountId = (JSON.parse(JSON.stringify(ex.signer)).id).toString();
        const motionHash = args.proposal;
        const voteApproved = args.approve;
        const councilMotionEntry = await councilMotionRepository.getByMotionHash(motionHash);
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
        existingVote = await councilMotionVoteRepository.getByCouncilMotionIdAndAccountId(councilMotionId, accountId);
        if (!existingVote) {
            const approved = voteApproved;
            const vote: CouncilMotionVoteEntity = <CouncilMotionVoteEntity>{};
            const voter = await accountRepository.findByAddressAndChain(accountId, chain.id);
            if (voter) {
                vote.account_id = voter.id;
            } else {
                const account: AccountEntity = <AccountEntity>{};
                account.address = accountId;
                account.chain_id = chain.id;
                const accountEntry = await accountRepository.insert(account);
                vote.account_id = accountEntry.id;
            }
            vote.council_motion_id = councilMotionId;
            vote.approved = approved;
            vote.block = blockEntity.id;
            councilMotionVoteRepository.insert(vote);
        }
    },

    //TODO utility batch handling
    async parseTreasuryTip(extrinsicEvents: Record<string, AnyJson>[], extrinsicMethod: any, extrinsic: any, args: any, blockEntity: BlockEntity): Promise<void> {
        switch (extrinsicMethod) {
            case ExtrinsicMethod.REPORTAWESOME: {
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method == EventMethod.NewTip);
                if (tipEvent) {
                    const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                    const tipProposalEntry = await tipProposalRepository.getByMotionHash(motionHash);
                    var beneficiaryEntry = await accountRepository.findByAddressAndChain(args.who, chain.id)
                    var finderEntry = await accountRepository.findByAddressAndChain(extrinsic.signer.Id, chain.id)
                    
                    if (!beneficiaryEntry) {
                        const beneficiary = <AccountEntity>{};
                        beneficiary.address = args.who
                        beneficiary.chain_id = chain.id
                        beneficiaryEntry = await accountRepository.insert(beneficiary)
                    }
                    if (!finderEntry) {
                        const finder = <AccountEntity>{};
                        finder.address = extrinsic.signer.Id
                        finder.chain_id = chain.id
                        finderEntry = await accountRepository.insert(finder)
                    }
                    if (tipProposalEntry) {
                        tipProposalEntry.reason = args.reason
                        tipProposalEntry.chain_id = chain.id
                        tipProposalEntry.proposed_at = blockEntity.id
                        tipProposalEntry.motion_hash = motionHash
                        tipProposalEntry.beneficiary = beneficiaryEntry.id
                        tipProposalEntry.finder = finderEntry.id
                        await tipProposalRepository.update(tipProposalEntry)
                    } else if (!tipProposalEntry) {
                        const tipProposal = <TipProposalEntity>{}
                        tipProposal.reason = args.reason
                        tipProposal.chain_id = chain.id
                        tipProposal.proposed_at = blockEntity.id
                        tipProposal.status = TipProposalStatus.Proposed
                        tipProposal.motion_hash = motionHash
                        tipProposal.beneficiary = beneficiaryEntry.id
                        tipProposal.finder = finderEntry.id
                        await tipProposalRepository.insert(tipProposal)
                    }
                }
                break;
            }
            case ExtrinsicMethod.RETRACTTIP: {
                const motionHash = args.hash
                const tipProposalEntry = await tipProposalRepository.getByMotionHash(motionHash);
                if (!tipProposalEntry) {
                    const tipProposal = <TipProposalEntity>{};
                    tipProposal.motion_hash = motionHash
                    tipProposal.status = TipProposalStatus.Retracted
                    tipProposal.chain_id = chain.id
                    await tipProposalRepository.insert(tipProposal)
                }
                break;
            }
            case ExtrinsicMethod.CLOSETIP: {
                // does querying for multiple events here even make sense?
                const tipEvent = extrinsicEvents.find((e: Record<string, AnyJson>) => e.method == EventMethod.TipClosed);
                const motionHash = JSON.parse(JSON.stringify(tipEvent!.data))[0];
                const tipProposalEntry = await tipProposalRepository.getByMotionHash(motionHash);
                if (!tipProposalEntry) {
                    const tipProposal = <TipProposalEntity>{};
                    tipProposal.motion_hash = motionHash;
                    tipProposal.status = TipProposalStatus.Closed;
                    tipProposal.value = JSON.parse(JSON.stringify(tipEvent!.data))[2];
                    tipProposal.chain_id = chain.id
                    tipProposalRepository.insert(tipProposal);
                }
                break;
            }
            case ExtrinsicMethod.TIP: {
                console.log(extrinsic.toHuman())
                break;
            }
        }
    }
};