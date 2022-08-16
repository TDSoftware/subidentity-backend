import { executionManager } from './../executionManager';
import { indexingService } from './indexingService';
import cluster from 'cluster';

const INCREMENT = 'INCREMENT';
const COUNTER = 'COUNTER';
const SLOT = 'SLOT';
let cpuCores = require('os').cpus().length;

export const clusterService = {

    async indexSlots(endpoint: string) {
        let slots: number[][] = [];
        if (cluster.isPrimary) {
            slots = await executionManager.createSlots(endpoint, cpuCores)

            let counter = 0;
            for (let i = 0; i < slots.length; i++) {
                cluster.fork();
            }

            cluster.on('exit', (worker) => {
                console.log("Worker " + worker.id + " died. Restarting...");
                counter = 0;
                cluster.disconnect();
                this.indexSlots(endpoint);
            });

            cluster.on('message', (worker, msg) => {
                if (msg.topic === INCREMENT) {
                    counter++
                    worker.send({ topic: COUNTER, value: counter - 1 });
                }
                if (msg.topic === SLOT) {
                    worker.send({ topic: SLOT, value: slots });
                }
            });

            console.log("Indexing will start on " + slots.length + " cores.");
        } else if(cluster.isWorker){
            // retrieve slots
            function retrieveSlots() {
                process.send!({ topic: SLOT});
            }
            setTimeout(retrieveSlots, 100 * cluster.worker!.id);
            process.on('message', (msg: any) => {
                if (msg.topic === SLOT) {
                    slots = msg.value;
                }
            });

            // retrieve counter to know which slot the worker should use
            function incrementCounter() {
                process.send!({ topic: INCREMENT });
            }
            setTimeout(incrementCounter, 100 * cluster.worker!.id);
            process.on('message', (msg: any) => {
                if (msg.topic === COUNTER) {
                    if (msg.value <= slots.length) {
                        indexingService.indexChain(endpoint, slots[msg.value][1], slots[msg.value][0]);
                    }
                }
            });
        }
    }
}