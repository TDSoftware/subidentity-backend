import { Router, Request, Response, NextFunction } from "express";
import { userService } from "../../services/userService";
import { UserDTO } from "../../types/dtos/UserDTO";
import { expectSchema } from "../../lib/typeChecker";

export const userRouter = Router();

userRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query.username === "string") {
            const user: UserDTO | undefined = await userService.findByUsername(req.query.username);
            if (!user) throw new Error("404:User not found");
            res.send({
                user
            });
        } else {
            const users: UserDTO[] = await userService.getAll();
            res.send({
                users
            });
        }
    } catch (e) {
        next(e);
    }
});

userRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        expectSchema(req.body, {
            type: "object",
            properties: {
                username: "string",
                password: "string",
                email: "string"
            }
        });
        const user = await userService.addUser(req.body);
        res.send({
            user
        });
    } catch (e) {
        next(e);
    }
});

userRouter.put("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        expectSchema(req.body, {
            type: "object",
            properties: {
                id: "number",
                username: "string",
                password: "string",
                email: "string"
            }
        });
        const user = await userService.updateUser(req.body);
        res.send({
            user
        });
    } catch (e) {
        next(e);
    }
});