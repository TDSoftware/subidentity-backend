import { ChainEntity } from "../../types/entities/ChainEntity";
import { parseAmount, translateIfByte } from "./indexingUtil";

describe("parseAmount should return the correct value", () => {
    const chain = <ChainEntity>{ token_symbol: "DOT", token_decimals: 10 };
    it("should parse the correct amount given the format: 1.000 kDOT", () => {
        const amount = "1.000 kDOT";
        const value = parseAmount(amount, chain);
        expect(value).toBe(1000);
    });
    it("should parse the correct amount given the format: 1.000 mDOT", () => {
        const amount = "1.000 mDOT";
        const value = parseAmount(amount, chain);
        expect(value).toBe(0.001);
    });
    it("should parse the correct amount given the format: 1.000 DOT", () => {
        const amount = "1.000 DOT";
        const value = parseAmount(amount, chain);
        expect(value).toBe(1);
    });
    it("should parse the correct amount given the format: 10,000,000,000", () => {
        const amount = "10,000,000,000";
        const value = parseAmount(amount, chain);
        expect(value).toBe(1);
    });
});

describe("translateIfByte should return the correct value", () => {
    it("should translate the byte to a string", () => {
        const input = "0x5465737420737472696e67"; // "Test string" as byte array...
        const value = translateIfByte(input);
        expect(value).toBe("Test string");
    });
    it("should translate the byte to another string", () => {
        const input = "0x5465737422354756"; // some random string
        const value = translateIfByte(input);
        expect(value === "Test string").toBeFalsy();
    });
    it("should return the string if it is not a byte", () => {
        const input = "Test string";
        const value = translateIfByte(input);
        expect(value).toBe(input);
    });
});

