import { Application } from "express";
import supertest from "supertest";
import { app, server } from "../api";
import { connection, databaseReady } from "./mysqlDatabase";

export function request(): supertest.SuperTest<supertest.Test> {
    return supertest(getApp());
}

export function getApp(): Application {
    return app;
}

export function setupTests(): void {

    beforeAll(() => {
        return new Promise((resolve: (val: void) => void): void => {
            const interval = setInterval(() => {
                if (databaseReady) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    });

    afterAll(() => {
        return new Promise((resolve: (val: void) => void) => {
            setTimeout(() => {
                connection.end();
                server.close(() => {
                    resolve();
                });
            });
        });
    });
}