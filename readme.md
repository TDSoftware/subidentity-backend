# SubIdentity Backend
SubIdentity backend is a Node.js backend developed for the [SubIdentity web application](https://github.com/TDSoftware/subidentity-webapp) that can be used to index a substrate chain which is implementing the identity pallet by providing an archive node. For indexed chains it can be used to search for identities e.g., in order to improve the [SubIdentity web application's](https://github.com/TDSoftware/subidentity-webapp) performance.

## Project setup

The project consists of two Node.js applications. A scheduler and an API service. The API Service is providing the API to be consumed e.g., by the [SubIdentity web application](https://github.com/TDSoftware/subidentity-webapp) to search for identities on substrate based chains. See chapter [API Documentation](#apiDocumentation) for more information. The scheduler is used to fetch and store identities from substrate based chains regularly in a MySQL Database to increase performance. You can find an illustration of the SubIdentity project architecture [here](./docs/architecture.svg). In order to be able to use the full functionality of the project, the API service and the scheduler must both be running.

### Installs dependencies
```
npm install
```

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

### Compiles and hot-reloads for development
API service:
```
npm run dev-api
```

Scheduler:
```
npm run dev-scheduler
```

### Compiles for production
```
npm run build
```

### Compiles and runs for production
API service:
```
npm run start-api
```

Scheduler:
```
npm run start-scheduler
```


### Runs your unit tests
Core functions are covered by unit tests to ensure functionality and robustness. To run the unit tests use:

```
npm run test
```

### Lints and fixes files

💡 Hint: Set up your IDE to automatically run that on save. Works in VS Code and IntelliJ.

```
npm run lint
```

## <a id="apiDocumentation"></a> API Documentation

In this chapter the available API is described. `http://localhost:5001/` is the default base URL of the API Service if you are running the application locally. For using the API you need to adjust the requests to fit your base URL.


### getIdentities
Returns a page of all identities of the chain of the provided wsProvider. Adjust the value for `wsProvider` to query from the respective chain of the given node endpoint. Adjust the value for `page` (page index to load) and `limit` (how many items on one page) to your needs.

Example request:
```
curl --location -g --request GET 'http://localhost:5001/identities?wsProvider=wss://rpc.polkadot.io&page=1&limit=5'
```

### searchIdentities
Returns a page of identities of the chain of the provided wsProvider fitting the search term. Adjust the value for `wsProvider` to query the corresponding chain of the specified node endpoint, replace `SEARCHKEY` with the desired search term and adjust the value for `page` (page index to load) and `limit` (how many items on one page) to your needs.

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

## Indexing
By default, the scheduler is set up to fetch identities from known chains at every 15th minute (e.g. 9:00, 9:15, 9:30, ...). Depending on the use case this value can be adjusted. Therefore, you need to adjust the cron schedule in [scheduler.ts](./src/scheduler.ts). For more information regarding the adjustment read about [node-cron](https://www.npmjs.com/package/node-cron).

ℹ️ If the API described above is used for requesting the chain status or identities for a node endpoint for the first time, the respective chain is added to the database if it implements the identity pallet, and the provided node is an archive node. When the scheduled indexing is running again, this chain will be indexed automatically. Thereupon the API Service can be used to fetch identities from this chain.