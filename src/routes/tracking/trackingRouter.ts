import { Router, Request, Response, NextFunction } from "express";
import { LogEntity } from "../../types/entities/LogEntity";
import { logRepository } from "../../repositories/logRepository";
import crypto from "crypto";

export const trackingRouter = Router();

trackingRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.event)
            throw new Error("400:Body parameter missing:event");

        if (!req.body.info)
            throw new Error("400:Body parameter missing:info");

        const log = <LogEntity>{};
        log.ip = req.ip;
        log.timestamp = Date.now();
        log.event = req.body.event;
        log.info = req.body.info;
        await logRepository.insert(log);
        res.status(200).send("Log entry created.");
    } catch (e) {
        next(e);
    }
});