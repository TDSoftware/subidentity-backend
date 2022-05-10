import { JsonSchema, validate } from "tv4";

export function expectString(data: string, errorMessage?: string): void {
    if (typeof data !== "string") {
        throw new TypeError(errorMessage ?? "Expect type of string.");
    }
}

export function expectSchema(data: unknown, schema: JsonSchema, errorMessage?: string): void {
    if (!schema.required && schema.type === "object") {
        schema.required = Object.keys(schema.properties);
    }
    const result = validate(data, schema);
    if (!result) {
        throw new Error(errorMessage ?? "400:Incoming data invalid.");
    }
}

export function expectType(value: unknown, type: string, errorMessage?: string): void {
    if (typeof value !== type) {
        throw new TypeError(errorMessage ?? "400:Expect type of " + type);
    }
}

export function expectNumber(value: unknown): void {
    expectType(value, "number");
}