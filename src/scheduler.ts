//  Apply environment variables from .env file to process.env. 
//  Needs to be done at the very beginning!
import { config } from "dotenv";
config();

import { schedulerService } from "./services/schedulerService";
import cron from "node-cron";

//fetch Identities every 15 minutes
//cron schedule expression can be changed
cron.schedule("*/15 * * * *", () => {
    schedulerService.fetchIdentities();
});

