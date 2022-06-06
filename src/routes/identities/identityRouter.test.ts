import { request, setupTests } from "../../lib/testSetup";
import { schedulerService } from "../../services/schedulerService";

jest.mock("../../repositories/identityRepository");
setupTests();

const wsProvider = "ws://fake.io";
const accountAddress = "ABCDEFGHI12345678";
const searchKey = "fake-email";

describe("GET /identities/:address", () => {

    it("should fetch a single identity for the wsProvider and account address", async () => {
        let response = await request().get("/chains/status?wsProvider=" + wsProvider);
        expect(response.statusCode).toBe(200);
        await schedulerService.fetchIdentities();
        response = await request().get("/identities/" + accountAddress + "?wsProvider=" + wsProvider);
        expect(response.statusCode).toBe(200);
        expect(response.body.identity.basicInfo.address).toBe(accountAddress);
        expect(response.body.identity.basicInfo.legal).toBe("fake-name");
        expect(response.body.identity.basicInfo.email).toBe("fake-email");
        expect(response.body.identity.basicInfo.riot).toBeUndefined();
        expect(response.body.identity.basicInfo.display).toBe("fake-display");
        expect(response.body.identity.chain).toBe("fake-chain-name");
    });

    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities/" + accountAddress);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

});

describe("GET /identities", () => {

    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

    it("should throw error since page number is missing in the query", async () => {
        const response = await request().get("/identities?wsProvider=" + wsProvider);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:page");
    });

    it("should throw error since page limit is missing in the query", async () => {
        const response = await request().get("/identities?wsProvider=" + wsProvider + "&page=1");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:limit");
    });

    it("should throw error since page number is not valid", async () => {
        const response = await request().get("/identities?wsProvider=" + wsProvider + "&page=yes&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page number");
    });

    it("should throw error since page limit is not valid", async () => {
        const response = await request().get("/identities?wsProvider=" + wsProvider + "&page=1&limit=no");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page limit");
    });

    it("should fetch all the identities for the wsProvider", async () => {
        const response = await request().get("/identities?wsProvider=" + wsProvider + "&page=1&limit=10");
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.identities.items)).toBe(true);
        expect(response.body.identities.items.length).toBe(1);
        expect(response.body.identities.items[0].basicInfo.address).toBe(accountAddress);
        expect(response.body.identities.items[0].basicInfo.legal).toBe("fake-name");
        expect(response.body.identities.items[0].basicInfo.email).toBe("fake-email");
        expect(response.body.identities.items[0].basicInfo.riot).toBe("fake-riot");
        expect(response.body.identities.items[0].basicInfo.display).toBe("fake-display");
        expect(response.body.identities.items[0].chain).toBe("fake-chain-name");
    });
});

describe("GET /identities/search", () => {
    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities/search");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

    it("should throw error since page number is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:page");
    });

    it("should throw error since page limit is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider + "&page=1");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:limit");
    });

    it("should throw error since page number is not valid", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider + "&page=yes&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page number");
    });

    it("should throw error since page limit is not valid", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider + "&page=1&limit=no");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page limit");
    });

    it("should throw error since searchKey is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider + "&page=1&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:searchKey");
    });

    it("should search the identities matching the key for the wsProvider", async () => {
        const response = await request().get("/identities/search?wsProvider=" + wsProvider + "&page=1&limit=10&searchKey=" + searchKey);
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.identities.items)).toBe(true);
        expect(response.body.identities.items.length).toBe(1);
        expect(response.body.identities.items[0].basicInfo.address).toBe(accountAddress);
        expect(response.body.identities.items[0].basicInfo.legal).toBe("fake-name");
        expect(response.body.identities.items[0].basicInfo.email).toBe("fake-email");
        expect(response.body.identities.items[0].basicInfo.riot).toBe("fake-riot");
        expect(response.body.identities.items[0].basicInfo.display).toBe("fake-display");
        expect(response.body.identities.items[0].chain).toBe("fake-chain-name");
    });
});