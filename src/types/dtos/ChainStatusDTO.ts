export interface ChainStatusDTO {
    isIndexed: boolean;
    isArchiveNode: boolean;
    implementsIdentityPallet: boolean;
    chainName: string;
}