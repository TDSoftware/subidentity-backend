import { ChainEntity } from "../../types/entities/ChainEntity";
import { u8aToString } from "@polkadot/util";

// parses the different types of amounts the polkadot js api returns
export function parseAmount(amount: any, chain: ChainEntity): number {
    let value = <number>{};
    if (String(amount).includes("k" + chain.token_symbol!)) {
        value = parseFloat(amount) * 1000;
    } else if (String(amount).includes("m" + chain.token_symbol!)) {
        value = parseFloat(amount) / 1000;
    } else if (String(amount).includes(chain.token_symbol!)) {
        value = parseFloat(amount);
    } else {
        value = parseFloat((amount.replace(/,/g, "") / Math.pow(10, chain.token_decimals!)).toFixed(chain.token_decimals!));
    }
    return value;
}

// checks if the response is a byte, if so, it converts it to a string, else return the string
export function translateIfByte(input: string): string {
    if (input.startsWith("0x")) {
        return u8aToString(Buffer.from(input.substring(2), "hex"));
    }
    return input;
}
