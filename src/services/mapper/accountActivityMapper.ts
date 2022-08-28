import { AccountActivity } from "@npmjs_tdsoftware/subidentity";
import { Activity, ActivityObject, InfoType, AccountActivityTypeEnum } from "@npmjs_tdsoftware/subidentity/lib/types/AccountActivity";
import { CouncilMotionDTO } from "../../types/dtos/CouncilMotionDTO";
import { CouncilMotionVoteDTO } from "../../types/dtos/CouncilMotionVoteDTO";
import { ProposalDTO } from "../../types/dtos/ProposalDTO";
import { ReferendumVoteDTO } from "../../types/dtos/ReferendumVoteDTO";
import { TipDTO } from "../../types/dtos/TipDTO";
import { TipProposalDTO } from "../../types/dtos/TipProposalDTO";

export const accountActivityMapper = {

    councilMotionDTOsToAccountActivities(councilMotions: CouncilMotionDTO[]): AccountActivity[] {
        return councilMotions.map((councilMotion: CouncilMotionDTO) => {
            return {
                primaryObject: ActivityObject.CouncilMotion,
                primaryObjectValue: councilMotion.index,
                secondaryObject: ActivityObject.CouncilMotion,
                secondaryObjectValue: councilMotion.index,
                additionalInfoType: InfoType.Description,
                additionalInfoValue: "proposed council motion",
                activity: Activity.Proposed,
                block: councilMotion.block,
                type: AccountActivityTypeEnum.Info
            };
        });
    },

    councilMotionVotesToAccountActivities(councilMotionVotes: CouncilMotionVoteDTO[]): AccountActivity[] {
        return councilMotionVotes.map((councilMotionVote: CouncilMotionVoteDTO) => {
            return {
                primaryObject: ActivityObject.CouncilMotion,
                primaryObjectValue: councilMotionVote.councilMotionIndex,
                secondaryObject: ActivityObject.CouncilMotion,
                secondaryObjectValue: councilMotionVote.councilMotionIndex,
                additionalInfoType: InfoType.Description,
                additionalInfoValue: "voted for council motion",
                activity: councilMotionVote.approved ? Activity.VotedAye : Activity.VotedNay,
                block: councilMotionVote.block,
                type: councilMotionVote.approved ? AccountActivityTypeEnum.ProVote : AccountActivityTypeEnum.ConVote
            };
        });
    },

    proposalsToAccountActivities(proposals: ProposalDTO[]): AccountActivity[] {
        return proposals.map((proposal: ProposalDTO) => {
            return {
                primaryObject: ActivityObject.DemocracyProposal,
                primaryObjectValue: proposal.proposalIndex,
                secondaryObject: ActivityObject.Referenda,
                secondaryObjectValue: proposal.referendumIndex,
                additionalInfoType: InfoType.Description,
                additionalInfoValue: "Added proposal for referendum",
                activity: Activity.Proposed,
                block: proposal.block,
                type: AccountActivityTypeEnum.Info
            };
        });
    },

    referendumVotesToAccountActivities(referendumVotes: ReferendumVoteDTO[]): AccountActivity[] {
        return referendumVotes.map((referendumVote: ReferendumVoteDTO) => {
            return {
                primaryObject: ActivityObject.Referenda,
                primaryObjectValue: referendumVote.referendumIndex,
                secondaryObject: ActivityObject.Referenda,
                secondaryObjectValue: referendumVote.referendumIndex,
                additionalInfoType: InfoType.Description,
                additionalInfoValue: "Voted for referendum",
                activity: referendumVote.vote ? Activity.VotedAye : Activity.VotedNay,
                block: referendumVote.block,
                type: referendumVote.vote ? AccountActivityTypeEnum.ProVote : AccountActivityTypeEnum.ConVote
            };
        });
    },

    tipsToAccountActivities(tips: TipDTO[]): AccountActivity[] {
        return tips.map((tip: TipDTO) => {
            return {
                primaryObject: ActivityObject.TreasuryTip,
                primaryObjectValue: tip.tipProposalHash,
                secondaryObject: ActivityObject.TreasuryTip,
                secondaryObjectValue: tip.value,
                additionalInfoType: InfoType.Description,
                additionalInfoValue: "Tipped on treasury tip",
                activity: Activity.Tipped,
                block: tip.block,
                type: AccountActivityTypeEnum.Treasury
            };
        });
    },

    tipProposalsToAccountActivities(tipProposals: TipProposalDTO[]): AccountActivity[] {
        return tipProposals.map((tipProposal: TipProposalDTO) => {
            return {
                primaryObject: ActivityObject.TreasuryTip,
                primaryObjectValue: tipProposal.beneficiary,
                secondaryObject: ActivityObject.TreasuryTip,
                secondaryObjectValue: tipProposal.beneficiary,
                additionalInfoType: InfoType.Reason,
                additionalInfoValue: tipProposal.reason,
                activity: Activity.Proposed,
                block: tipProposal.block,
                type: AccountActivityTypeEnum.Treasury
            };
        });
    }
};