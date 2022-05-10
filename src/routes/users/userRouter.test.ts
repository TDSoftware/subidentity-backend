import { getApp, request, setupTests } from "../../lib/testSetup";
import faker from "@faker-js/faker";

setupTests();

describe("POST /users", () => {
    test("Create new user and return new user", async () => {
        
        const username = faker.name.findName();
        const email = faker.internet.email();
        const password = "Strong Password";

        const response = await request().post("/users").send({
            username,
            password,
            email
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.user.username).toBe(username);
        expect(response.body.user.password).toBe(password);
        expect(response.body.user.email).toBe(email);
        expect(typeof response.body.user.id).toBe("number");
    });

    test("Missing username will throw error", async () => {
        
        const email = faker.internet.email();
        const password = "Strong Password";

        const response = await (request().post("/users").send({
            password,
            email
        }));
        
        expect(response.statusCode).toBe(400);
    });
});
