import { config } from "dotenv";
config();

import { schedulerService } from "./services/schedulerService";
import cron from "node-cron";

//fetch Identities every scheduled
//cron schedule expression can be changeds
cron.schedule("*/15 * * * *", () => {
    schedulerService.fetchIdentities();
});

