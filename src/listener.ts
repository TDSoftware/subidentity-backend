import { config } from "dotenv";
config();

import minimist from "minimist";
import { listenerService } from "./services/listenerService";

const args = minimist(process.argv.slice(2));

listenerService.parseNewBlocks(args.endpoint);