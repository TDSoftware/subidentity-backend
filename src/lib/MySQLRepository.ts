import { escape } from "mysql";
import { runInsertQuery, runSelectQuery, runUpdateQuery } from "./mysqlDatabase";
import { expectNumber } from "./typeChecker";

interface BaseEntity {
    id: number;
}

export class MySQLRepository<Entity extends BaseEntity> {

    async update<UpdateEntity extends BaseEntity>(entity: UpdateEntity): Promise<Entity> {
        expectNumber(entity.id);
        const updateQuery = [];
        for (const key in entity) {
            if (key === "id") continue;
            updateQuery.push(`\`${key}\`=${escape(entity[key])}`);
        }
        await runUpdateQuery(`UPDATE ${this.tableName} SET ${updateQuery.join(", ")} WHERE id=${escape(entity.id)}`);
        return await this.getById(entity.id);
    }

    async insert<InsertEntity>(entity: InsertEntity): Promise<Entity> {
        const { insertId } = await runInsertQuery<InsertEntity>(`INSERT INTO ${this.tableName} SET ?`, entity);
        return await this.getById(insertId);
    }

    async getById(id: number | string): Promise<Entity> {
        return (await runSelectQuery<Entity>(`SELECT * FROM ${this.tableName} WHERE id=${escape(id)} LIMIT 1;`))[0];
    }

    async getAll(): Promise<Entity[]> {
        return await runSelectQuery(`SELECT * FROM ${this.tableName}`);
    }

    get tableName(): string {
        throw new Error("Please define a MySQL table name for your repository.");
    }
}