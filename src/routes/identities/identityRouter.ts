import { Router, Request, Response, NextFunction } from "express";
import { identityService } from "../../services/identityService";
import { Identity, Page } from "@npmjs_tdsoftware/subidentity";

export const identityRouter = Router();

identityRouter.get("/search", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if(typeof req.query.wsProvider !== "string")
            throw new Error("400:Query parameter missing:wsProvider");
        
        if(typeof req.query.page !== "string")
            throw new Error("400:Query parameter missing:page");
        
        if(typeof req.query.limit !== "string")
            throw new Error("400:Query parameter missing:limit");
        
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit); 
        
        if(isNaN(page))
            throw new Error("400:Please send a valid page number");

        if(isNaN(limit))
            throw new Error("400:Please send a valid page limit");    
        
        if (typeof req.query.searchKey === "string") {
            const identities: Page<Identity> = await identityService.searchIdentitiesByWsProviderAndKey(req.query.wsProvider, req.query.searchKey, page, limit);
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

identityRouter.get("/:address", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if(typeof req.params.address !== "string")
            throw new Error("400:Path variable missing:address");

        if(typeof req.query.wsProvider !== "string")
            throw new Error("400:Query parameter missing:wsProvider");
        
        const identity: Identity | undefined = await identityService.findOneByWsProviderAndAccountAddress(req.query.wsProvider, req.params.address);
        if (!identity) throw new Error("404:Identity not found");
        res.send({
            identity
        });
        
    } catch (e) {
        next(e);
    }
});

identityRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
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
        
        if(isNaN(page))
            throw new Error("400:Please send a valid page number");

        if(isNaN(limit))
            throw new Error("400:Please send a valid page limit"); 
                
        const identities: Page<Identity> = await identityService.getAllIdentitiesByWsProvider(req.query.wsProvider, page, limit);
        res.send({
            identities
        });
    } catch (e) {
        next(e);
    }
});


