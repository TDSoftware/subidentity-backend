import { readdirSync, readFileSync } from "fs";
import mysql, { MysqlError, queryCallback } from "mysql";
import { join } from "path";

export let databaseReady = false;

export interface QueryResult {
    fieldCount: number;
    affectedRows: number;
    insertId: number;
    serverStatus: number;
    warningCount: number;
    message: string;
    protocol41: boolean;
    changedRows: number;
}

/**
 * We are using one global connection to the MySQL database in the whole
 * NodeJS app instance.
 */
export const connection = mysql.createPool({ // TODO: move to .env
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: Number(process.env.DATABASE_MAX_CONNECTIONS)
});

export function runQuery(sqlStatement: string): Promise<void> {
    return new Promise((resolve: () => void, reject: (error: MysqlError) => void) => {
        const callback: queryCallback = (error: MysqlError | null): void => {
            if (error) return reject(error);
            resolve();
        };
        connection.query(sqlStatement, callback);
    });
}

export function runSelectQuery<T>(sqlStatement: string): Promise<T[]> {
    return new Promise((resolve: (results: T[]) => void, reject: (error: MysqlError) => void) => {
        const callback: queryCallback = (error: MysqlError | null, results: T[]): void => {
            if (error) return reject(error);
            resolve(results);
        };
        connection.query(sqlStatement, callback);
    });
}

export function runInsertQuery<T>(sqlStatement: string, data: T): Promise<QueryResult> {
    return new Promise((resolve: (results: QueryResult) => void, reject: (error: MysqlError) => void) => {
        const callback: queryCallback = (error: MysqlError | null, results: QueryResult): void => {
            if (error) return reject(error);
            resolve(results);
        };
        connection.query(sqlStatement, data, callback);
    });
}

export function runUpdateQuery(sqlStatement: string): Promise<QueryResult> {
    return new Promise((resolve: (results: QueryResult) => void, reject: (error: MysqlError) => void) => {
        const callback: queryCallback = (error: MysqlError | null, results: QueryResult): void => {
            if (error) return reject(error);
            resolve(results);
        };
        connection.query(sqlStatement, callback);
    });
}

/**
 * See function "migrateDatabase". This query is used to create a MIGRATION table 
 * in the database to track the status of the migrations.
 */
const createMigrationTableQuery = `
    CREATE TABLE IF NOT EXISTS MIGRATION (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        executedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

/**
 * Should run e.g. on startup to bring the datbase up to date. The scripts 
 * should start with a number like "0006_..." to be sure that all scripts run 
 * in the wanted sequence. The status is stored in a "MIGRATION" table in the 
 * MySQL database itself.
 * 
 * @param {string} pathToMigrationScripts - directory including the SQL scripts 
 *                                          for the database migrations
 */
export async function migrateDatabase(pathToMigrationScripts: string): Promise<void> {
    console.log("[database] Path to migration scripts: ", pathToMigrationScripts);
    await runQuery(createMigrationTableQuery);
    const filenames = readdirSync(pathToMigrationScripts);
    console.log("[database] Got file names of migration scripts: ", filenames);
    for (const filename of filenames) {
        const [{ amount }] = await runSelectQuery(
            `SELECT COUNT(*) as amount FROM MIGRATION WHERE name="${filename}"`
        );
        if (amount === 0) {
            const filepath = join(pathToMigrationScripts, filename);
            console.log("[database] File path of migration script to run: ", filepath);
            const sqlQuery = readFileSync(filepath, "utf-8");
            await runQuery(sqlQuery);
            await runInsertQuery("INSERT INTO MIGRATION SET ?", { name: filename });
            console.log(
                /* green */ "\x1b[32m%s\x1b[0m",
                "[mysqlDatabase] Migration successful: " + filename
            );
        } else {
            console.log("[mysqlDatabase] Migration skipped: ", filename);
        }
    }
    databaseReady = true;
}