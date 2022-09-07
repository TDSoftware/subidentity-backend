
//  Apply environment variables from .env file to process.env. 
//  Needs to be done at the very beginning!
import { config } from "dotenv";
if (process.env.NODE_ENV == "test") { config({ path: `./.env.${process.env.NODE_ENV}` }) }
else config();

import { json } from "body-parser";
import express, { Application, NextFunction, Request, Response } from "express";
import { join } from "path";
import { migrateDatabase } from "./lib/mysqlDatabase";
import { chainRouter } from "./routes/chains/chainRouter";
import { versionRouter } from "./routes/versionRouter";
import { identityRouter } from "./routes/identities/identityRouter";
import { Server } from "http";
import cors from "cors";

export const app: Application = express();
export let server: Server;

startUp();

/**
 *  When adding a new router, register it here with the 
 *  corresponding URL path.
 */
function registerRouters(app: Application): void {
    const basePath = config.BASE_PATH ?? "";
    app.use(basePath + "/chains", chainRouter);
    app.use(basePath + "/version", versionRouter);
    app.use(basePath + "/identities", identityRouter);
}

/**
 *  If the error thrown has the following message format: 
 *  "{status_code}:{message}", e.g. "403:Wrong credentials"
 * 
 *  The response is parsed to have the status code from the error and message
 *  in the response body.
 */
function registerErrorHandler(app: Application): void {
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err.message.charAt(3) === ":") {
            const statusCode = Number(err.message.substring(0, 3));
            const errorMessage = err.message.slice(4);
            res.status(statusCode).send({ error: errorMessage });
        } else {
            res.status(500).send({ error: err.message, stack: err.stack });
        }
        next();
    });
}

/**
 *  Some of the tasks on startup are async, so we need to put
 *  it into an async function. Once global async is available,
 *  we can put that code in global scope.
 */
async function startUp(): Promise<void> {
    await migrateDatabase(join(__dirname, "dbMigrations"));
    app.use(cors());
    app.use(json());
    registerRouters(app);
    registerErrorHandler(app);
    server = app.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}.`));
}
