import { execSync } from "child_process";
import { Router, Request, Response } from "express";
import packageJSON from "../../package.json";

export const versionRouter = Router();

const gitCommand = "git rev-parse HEAD";

/**
 * GET /version
 * get version and git commit hash of application
 * @returns current version and git commit hash of application
 */
versionRouter.get("/", async (req: Request, res: Response) => {
    res.send({
        version: packageJSON.version,
        commitHash: execSync(gitCommand).toString().slice(0, 7)
    });
});