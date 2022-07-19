import { Router, Request, Response, NextFunction } from "express";
import { chainService } from "../../services/chainService";
import { ChainStatusDTO } from "../../types/dtos/ChainStatusDTO";
export const chainRouter = Router();

/**
 * GET /chains/status
 * get chain status information for a given wsProvider
 * @param req Request containing wsProvider
 * @throws 400 Error when wsProvider is missing or the status request failed or a 503 Error if a connection to the endpoint could not be established
 * @returns requested chain status
 */
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