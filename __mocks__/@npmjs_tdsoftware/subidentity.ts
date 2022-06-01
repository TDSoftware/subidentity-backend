import { Identity, Token } from "@npmjs_tdsoftware/subidentity";

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
    },
    getCompleteIdentities(): Identity[] {
        return [
            {
                "basicInfo": {
                    "address": "ABCDEFGHI12345678",
                    "legal": "fake-name",
                    "email": "fake-email",
                    "riot": undefined,
                    "display": "fake-display",
                },
                "chain": "fake-chain-name"
            }
        ]
    },
    getIdentity(): Identity {
        return {
            "basicInfo": {
                "address": "ABCDEFGHI12345678",
                "legal": "fake-name",
                "email": "fake-email",
                "riot": undefined,
                "display": "fake-display",
                "twitter": undefined,
                "web": undefined
            },
            "chain": "fake-chain-name"
        }
    }
}; 