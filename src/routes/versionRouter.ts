import { execSync } from "child_process";
import { Router, Request, Response } from "express";
import packageJSON from "../../package.json";

export const versionRouter = Router();

const gitCommand = "git rev-parse HEAD";

versionRouter.get("/", async (req: Request, res: Response) => {
    res.send({
        version: packageJSON.version,
        commitHash: execSync(gitCommand).toString().slice(0, 7)
    });
});