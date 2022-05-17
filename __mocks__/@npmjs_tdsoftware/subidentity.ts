import { Token } from "@npmjs_tdsoftware/subidentity";

module.exports = {
    implementsIdentityPallet(): boolean {
        return true;
    },
    isArchiveNode(): boolean {
        return true;
    },
    getChainName(): string {
        return "fake-chain-name";
    },
    getTokenDetails(): Token {
        return {
            symbol: "XYZ",
            decimals: 10 
        };
    }
}; 