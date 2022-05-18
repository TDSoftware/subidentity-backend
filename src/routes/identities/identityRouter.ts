import { Router, Request, Response, NextFunction } from "express";
import { identityService } from "../../services/identityService";
import { IdentityResponseDTO } from "../../types/dtos/IdentityResponseDTO";

export const identityRouter = Router();

identityRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if(typeof req.query.wsProvider !== "string") {
            throw new Error("400:Query parameter missing:wsProvider");
        }
        if (typeof req.query.address === "string") {
            const identity: IdentityResponseDTO | undefined = await identityService.findOneByWsProviderAndAccountAddress(req.query.wsProvider, req.query.address);
            if (!identity) throw new Error("404:Identity not found");
            res.send({
                identity
            });
        } else {
            if(typeof req.query.page !== "string") {
                throw new Error("400:Query parameter missing:page");
            }
            if(typeof req.query.limit !== "string") {
                throw new Error("400:Query parameter missing:limit");
            }
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
            const identities: IdentityResponseDTO[] = await identityService.getAllIdentitiesByWsProvider(req.query.wsProvider, page, limit);
            res.send({
                identities
            });
        }
    } catch (e) {
        next(e);
    }
});

identityRouter.get("/search", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if(typeof req.query.wsProvider !== "string") {
            throw new Error("400:Query parameter missing:wsProvider");
        }
        if(typeof req.query.page !== "string") {
            throw new Error("400:Query parameter missing:page");
        }
        if(typeof req.query.limit !== "string") {
            throw new Error("400:Query parameter missing:limit");
        }
        
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit); 
        if (typeof req.query.searchKey === "string") {
            const identities: IdentityResponseDTO[] = await identityService.searchIdentitiesByWsProviderAndKey(req.query.wsProvider, req.query.searchKey, page, limit);
            res.send({
                identities
            });
        } else {
            throw new Error("400:Query parameter missing:searchKey");
        }
    } catch (e) {
        next(e);
    }
});