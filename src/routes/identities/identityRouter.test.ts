import { request, setupTests } from "../../lib/testSetup";

setupTests();

const wsProvider = "ws://fake.io";
const accountAddress = "ABCDEFGHI12345678";
const searchKey = "fake";

describe("GET /identities", () => {
    
    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

    it("should throw error since page number is missing in the query", async () => {
        const response = await request().get("/identities?wsProvider="+wsProvider);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:page");
    });

    it("should throw error since page limit is missing in the query", async () => {
        const response = await request().get("/identities?wsProvider="+wsProvider+"&page=1");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:limit");
    });

    it("should throw error since page number is not valid", async () => {
        const response = await request().get("/identities?wsProvider="+wsProvider+"&page=yes&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page number");
    });

    it("should throw error since page limit is not valid", async () => {
        const response = await request().get("/identities?wsProvider="+wsProvider+"&page=1&limit=no");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page limit");
    });

    it("should fetch all the identities for the wsProvider", async () => {
        const response = await request().get("/identities?wsProvider="+wsProvider+"&page=1&limit=10");
        //TODO : update test case after service is implemented
        expect(response.statusCode).toBe(501);
    });
});

describe("GET /identities/:address", () => {

    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities/"+accountAddress);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

    it("should fetch a single identity for the wsProvider and account address", async () => {
        const response = await request().get("/identities/"+accountAddress+"?wsProvider="+wsProvider);
        //TODO : update test case after service is implemented
        expect(response.statusCode).toBe(501);
    });
});

describe("GET /identities/search", () => {
    it("should throw error since wsProvider is missing in the query", async () => {
        const response = await request().get("/identities/search");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:wsProvider");
    });

    it("should throw error since page number is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider);
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:page");
    });

    it("should throw error since page limit is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider+"&page=1");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:limit");
    });

    it("should throw error since page number is not valid", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider+"&page=yes&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page number");
    });

    it("should throw error since page limit is not valid", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider+"&page=1&limit=no");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Please send a valid page limit");
    });

    it("should throw error since searchKey is missing in the query", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider+"&page=1&limit=10");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:searchKey");
    });

    it("should search the identities matching the key for the wsProvider", async () => {
        const response = await request().get("/identities/search?wsProvider="+wsProvider+"&page=1&limit=10&searchKey="+searchKey);
        //TODO : update test case after service is implemented
        expect(response.statusCode).toBe(501);
    });
});