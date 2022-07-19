export enum BountyMethod {
    BountyRejected = "BountyRejected",
    BountyAwarded = "BountyAwarded",
    // "BountyCanceled" is not a spelling mistake on our part, it's what is given by the API.
    BountyCancelled = "BountyCanceled",
    BountyExtended = "BountyExtended"
}