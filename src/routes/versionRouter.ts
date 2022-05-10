import { Router, Request, Response } from "express";
import packageJSON from "../../package.json";

export const versionRouter = Router();

versionRouter.get("/", async (req: Request, res: Response) => {
    res.send({
        version: packageJSON.version
    });
});