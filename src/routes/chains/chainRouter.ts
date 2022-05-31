import { Router, Request, Response, NextFunction } from "express";
import { chainService } from "../../services/chainService";
import { ChainStatusDTO } from "../../types/dtos/ChainStatusDTO";
export const chainRouter = Router();

chainRouter.get("/status", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.wsProvider === "string") {
            const chainStatus: ChainStatusDTO | undefined = await chainService.findByWsProvider(req.query.wsProvider);
            if (!chainStatus) throw new Error("400:Chain status is not available for the requested wsProvider");
            res.send({
                chainStatus
            });
        } else {
            throw new Error("400:Query parameter missing:wsProvider");
        }
    } catch (e) {
        if (e instanceof Error && e.message === "Could not connect to endpoint.") next(new Error("503:" + e.message));
        else next(e);
    }
});