import packageJSON from "../../package.json";
import { request, setupTests } from "../lib/testSetup";
import { execSync } from "child_process";

setupTests();

const gitCommand = "git rev-parse HEAD";
const commitHash = execSync(gitCommand).toString().slice(0, 7);

describe("GET /version", () => {
    test("Returns correct version", async () => {
        const response = await request().get("/version");
        expect(response.statusCode).toBe(200);
        expect(response.body.version).toBe(packageJSON.version);
        expect(response.body.commitHash).toBe(commitHash);
    });
});