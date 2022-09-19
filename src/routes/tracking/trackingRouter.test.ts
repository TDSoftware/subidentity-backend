import { request, setupTests } from "../../lib/testSetup";

setupTests();

describe("POST /log", () => {
    it("should throw error if event is missing in the query", async () => {
        const response = await request().post("/log?info=info");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:event");
    });

    it("should throw error since info is missing in the query", async () => {
        const response = await request().post("/log?event=event");
        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBe("Query parameter missing:info");
    });

    it("should create a log entry", async () => {
        const response = await request().post("/log?event=event&info=info");
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe("Log entry created.");
    });
});
