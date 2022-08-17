import { config } from "dotenv";
import minimist from "minimist";
config();

import { listenerService } from './services/listenerService';

const args = minimist(process.argv.slice(2));

listenerService.parseNewBlocks(args.endpoint);