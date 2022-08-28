import { config } from "dotenv";
config();

import minimist from "minimist";
import { indexingService } from "./services/indexingService";

const args = minimist(process.argv.slice(2));

indexingService.indexChain(args.endpoint, args.from, args.to);
