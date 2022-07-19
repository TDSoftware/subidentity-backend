import { request, setupTests } from "../../lib/testSetup";

setupTests();

jest.mock("@npmjs_tdsoftware/subidentity");

const wsProvider = "ws://fake.io";

describe("GET /chains/status", () => {
    it("should fetch the chain status", async () => {
        const response = await request().get("/chains/status?wsProvider=" + wsProvider);
        expect(response.statusCode).toBe(200);
        expect(response.body.chainStatus.isArchiveNode).toBe(true);
        expect(response.body.chainStatus.implementsIdentityPallet).toBe(true);
        expect(response.body.chainStatus.chainName).toBe("fake-chain-name");
    });

    it("should throw error since query parameter is missing", async () => {
        const response = await request().get("/chains/status");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

});