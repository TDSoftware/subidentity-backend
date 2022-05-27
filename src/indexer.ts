import { config } from "dotenv";
import minimist from "minimist";
config();

import { indexingService } from "./services/indexingService";

const args = minimist(process.argv.slice(2));

indexingService.indexChain("wss://kusama-rpc.polkadot.io", args.from, args.to);
