import { Router, Request, Response, NextFunction } from "express";
import { identityService } from "../../services/identityService";
import { Identity, Page } from "@npmjs_tdsoftware/subidentity";

export const identityRouter = Router();

/**
 * GET /identities/search
 * search for identitites in a selected substrate based chain 
 * @param req Request containing wsProvider, searchKey, page and limit as query parameter
 * @throws 400 Error when pagination details are invalid, wsProvider or search key are missing or a 503 Error if a connection to the endpoint could not be established
 * @returns requested page with identitites matching search query
 */
identityRouter.get("/search", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.wsProvider !== "string")
            throw new Error("400:Query parameter missing:wsProvider");

        if (typeof req.query.page !== "string")
            throw new Error("400:Query parameter missing:page");

        if (typeof req.query.limit !== "string")
            throw new Error("400:Query parameter missing:limit");

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);

        if (isNaN(page))
            throw new Error("400:Please send a valid page number");

        if (isNaN(limit))
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
        if (e instanceof Error && e.message === "Could not connect to endpoint.") next(new Error("503:" + e.message));
        next(e);
    }
});

/**
 * GET /identities/:address
 * fetch an Identity from a selected substrate based chain and address
 * @param req Request containing wsProvider and address
 * @throws 400 Error when wsProvider or address are missing or 503 Error when a connection to the endpoint could not be established
 * @returns requested identity with the provided address
 */
identityRouter.get("/:address", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.address !== "string")
            throw new Error("400:Path variable missing:address");

        if (typeof req.query.wsProvider !== "string")
            throw new Error("400:Query parameter missing:wsProvider");

        const identity: Identity | undefined = await identityService.findOneByWsProviderAndAccountAddress(req.query.wsProvider, req.params.address);
        if (!identity) throw new Error("404:Identity not found");
        res.send(
            identity
        );

    } catch (e) {
        if (e instanceof Error && e.message === "Could not connect to endpoint.") next(new Error("503:" + e.message));
        if (e instanceof Error && e.message === "Unable to find an identity with the provided address.") next(new Error("400:" + e.message));
        next(e);
    }
});

/**
 * GET /identities
 * fetch identitites from a selected substrate based chain 
 * @param req Request containing wsProvider, page and limit as query parameter
 * @throws 400 Error when pagination details are invalid, or wsProvider is missing or a 503 Error if a connection to the endpoint could not be established
 * @returns requested page with identitites
 */
identityRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.wsProvider !== "string") {
            throw new Error("400:Query parameter missing:wsProvider");
        }
        if (typeof req.query.page !== "string") {
            throw new Error("400:Query parameter missing:page");
        }
        if (typeof req.query.limit !== "string") {
            throw new Error("400:Query parameter missing:limit");
        }
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);

        if (isNaN(page))
            throw new Error("400:Please send a valid page number");

        if (isNaN(limit))
            throw new Error("400:Please send a valid page limit");

        const identities: Page<Identity> = await identityService.getAllIdentitiesByWsProvider(req.query.wsProvider, page, limit);
        res.send({
            identities
        });
    } catch (e) {
        if (e instanceof Error && e.message === "Could not connect to endpoint.") next(new Error("503:" + e.message));
        next(e);
    }
});


