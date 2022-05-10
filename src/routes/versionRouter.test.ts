import packageJSON from "../../package.json";
import { request, setupTests } from "../lib/testSetup";

setupTests();

describe("GET /version", () => {
    test("Returns correct version", async () => {
        const response = await request().get("/version");
        expect(response.statusCode).toBe(200);
        expect(response.body.version).toBe(packageJSON.version);
    });
});