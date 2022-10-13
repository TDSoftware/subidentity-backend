# SubIdentity Backend
SubIdentity backend is a Node.js backend developed for the [SubIdentity web application](https://github.com/TDSoftware/subidentity-webapp) that can be used to index a Substrate based chain which is implementing the identity pallet by providing an archive node. For indexed chains it can be used to search for identities e.g., in order to improve the [SubIdentity web application's](https://github.com/TDSoftware/subidentity-webapp) performance.

The project consists of 4 Node.js applications. An indexer, a listener, a scheduler and an API service. 
You can find an illustration of the SubIdentity project architecture [here](./docs/architecture.svg). In order to be able to use the full functionality of the project, the API service, the listener, the scheduler and the MySQL database must be running. 

> The wanted attached chains need to be indexed before use.

## Components

### API Service
The API Service is providing the API to be consumed e.g., by the [SubIdentity web application](https://github.com/TDSoftware/subidentity-webapp) to retrieve detailed information about identities on substrate based chains. See chapter [API Documentation](#apiDocumentation) for more information. 

### The Indexer
The indexer is indexing all blocks from a given substrate based chain to retrieve detailed information about accounts. All information is stored in a MySQL database. See chapter [General Indexing](#generalIndexing) for more information. 

### The Listener
After the chain is indexed by the Indexer, the Listener keeps the data in the MySQL database up to date by subscribing to new arriving blocks.

### The Scheduler
The Scheduler is used to fetch and store basic information about identities from Substrate based chains regularly in a MySQL Database to increase performance. 

### MySQL Datatbase

With this project a [docker compose](./docker-compose.yml) file was provided to set up a MySQL Database, that can be used as follows:

```
docker-compose up -d
```

Alternatively, a MySQL Database can be set up manually.

❗ In order to establish a connection to the database sucessfully you need to duplicate the [.env.template](./.env.template) file and name it `.env`. Edit the values to fit your database setup. ℹ️ If you are using the provided docker compose file, the values in the [.env.template](./.env.template) are set correctly and just need to be copied to an `.env` file.

#### Database Migration

The application is using migration files to add, update or delete database tables. They can be found in [dbMigrations](./src/dbMigrations/) folder. The database should only be adjusted in this way. The SQL commands in the migration files are executed only on startup of the API service. The execution is documented in a `MIGRATION` table in the database, to prevent the same commands from being executed multiple times.

ℹ️ After a change in the migrations files or before the first startup of the scheduler, the API Service needs to be run as described below, to migrate the database correctly.

## Get Started

### Install dependencies

Open a terminal in your project folder and run:
``` bash
npm install
```

### Compile and run for development
```bash
# API Service
npm run dev-api 

# Scheduler
npm run dev-scheduler
```

### Compile for production
```bash
# Will compile typrscript to javascript and copies files into the "./dist" folder:
npm run build
```

### Compile and run for production

```bash
# Run API:
npm run start-api

# Run scheduler:
npm run start-scheduler

# Run listener:
npm run start-listener

# Run indexer:
npm run start-indexer
```


### Run tests
Core functions are covered by unit and integration tests to ensure functionality and robustness. 

> ⚡ You need to have the database running during running the tests!

To run the tests use the following command:
```bash
npm test
```

### Lints and fixes files

💡 Hint: Set up your IDE to automatically run that on save. Works in VS Code and IntelliJ.

```bash
npm run lint
```

## <a id="apiDocumentation"></a> API Documentation

In this chapter the available API is described. `http://localhost:5001/` is the default base URL of the API Service if you are running the application locally. For using the API you need to adjust the requests to fit your base URL.


### getIdentities
Returns a page of all identities of the chain of the provided wsProvider. Adjust the value for `wsProvider` to query from the respective chain of the given node endpoint. Adjust the value for `page` (page index to load, ℹ️ index of first page is 1) and `limit` (how many items on one page) to your needs.

Example request:
```
curl --location -g --request GET 'http://localhost:5001/identities?wsProvider=wss://rpc.polkadot.io&page=1&limit=5'
```

### searchIdentities
Returns a page of identities of the chain of the provided wsProvider fitting the search term. Adjust the value for `wsProvider` to query the corresponding chain of the specified node endpoint, replace `SEARCHKEY` with the desired search term and adjust the value for `page` (page index to load, ℹ️ index of first page is 1) and `limit` (how many items on one page) to your needs.

Example request:
```
curl --location --request GET 'http://localhost:5001/identities/search?wsProvider=wss://rpc.polkadot.io&searchKey=SEARCHKEY&page=1&limit=5'
```

### getIdentity
Returns an identity of the chain of the provided wsProvider for the given address. Adjust the value for `wsProvider` to query from the respective chain of the given node endpoint and replace `ADDRESS` with the address of the identity to request.

Example request:
```
curl --location --request GET 'http://localhost:5001/identities/ADDRESS?wsProvider=wss://rpc.polkadot.io'
```

### getChainStatus
Returns the status of the chain of provided wsProvider. Adjust the value for `wsProvider` to query from the respective chain of the given node endpoint.

Example request:
```
curl --location --request GET 'http://localhost:5001/chains/status?wsProvider=wss://rpc.polkadot.io'
```


### version
Returns the version and git commit hash of the application.

Example request:
```
curl --location --request GET 'http://localhost:5001/version'
```

## Identity Indexing
By default, the scheduler is set up to fetch identities from known chains at every 15th minute (e.g. 9:00, 9:15, 9:30, ...). Depending on the use case this value can be adjusted. Therefore, you need to adjust the cron schedule in [scheduler.ts](./src/scheduler.ts). For more information regarding the adjustment read about [node-cron](https://www.npmjs.com/package/node-cron).

ℹ️ If the API described above is used for requesting the chain status or identities for a node endpoint for the first time, the respective chain is added to the database if it implements the identity pallet, and the provided node is an archive node. When the scheduled indexing is running again, this chain will be indexed automatically. Thereupon the API Service can be used to fetch identities from this chain.

## <a id="generalIndexing"></a> General Indexing
The indexer uses the polkadot js api to retrieve the data to our database. To index a chain, you first have to call the /chain/status?parameter=wss://endpoint.rpc.url route to add the corresponding chain to the database (the chain to be indexed has to implement the identity pallet to be added to the db). To increase efficiency, the indexer will determine the amount of cpu cores in the executing machine and will create batches of blocks to separately be indexed by different workers. When starting the indexer, two different scripts will be executed concurrently: the indexer and a block listener. The block listener will subscribe to new blocks and run the indexing functions on them. The indexer will separate the unindexed blocks of a chain and turn them into batches to distribute the workload among the available cpu cores. The indexing process can take a while (possibly multiple days) depending on the hardware it is executed on and the performance of the given endpoint. It is recommended to run this service on a machine with at least 16 CPU cores, preferably more. If for any reason the indexer crashes, it can be restarted by using the same command. It will recalculate the batches and pick up where it left off. When starting the indexer for a chain with custom pallets, there might be warning messages popping up.

## Indexing Getting Started

(!) Before running any of the following commands, call this route with the corresponding endpoint.
This will add the wsProvider to the database, which is a necessary step before starting any of the indexing services.
Furthermore, the chain can only be added to the database if it implements the identity pallet.
```
.../chain/status?parameter=wss://endpoint.rpc.url 
```

Indexer and listener concurrently (given --endpoint for both scripts in package.json):

The script is defined in the package.json file and will only function properly on linux/ MacOS operating systems.
Running the script on windows will require you to replace the & with && in the package.json script. 

```
npm run dev-exec 
```

Indexer only (given --from and --to blocks in package.json):
```
npm run dev-indexer 
```

Listener only (given --endpoint in package.json):
```
npm run dev-listener
```

