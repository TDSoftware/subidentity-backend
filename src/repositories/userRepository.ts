import { escape } from "mysql";
import { runSelectQuery } from "../lib/mysqlDatabase";
import { MySQLRepository } from "../lib/MySQLRepository";
import { UserEntity } from "../types/entities/UserEntity";

class UserRepository extends MySQLRepository<UserEntity> {

    get tableName(): string {
        return "user";
    }

    async findByUsername(username: string): Promise<UserEntity|undefined> {
        const query = `SELECT * FROM ${this.tableName} WHERE username=${escape(username)}`;
        return (await runSelectQuery<UserEntity>(query))[0];
    }

}

export const userRepository = new UserRepository();