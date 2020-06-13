import errorHandler from "errorhandler";
import express from "express";
// import fs from "fs";
import app from "./app";
import dotenv from "dotenv";
import socket from "./socket/index";
// const key = fs.readFileSync(__dirname + '/../sslCert/key.pem')
// const cert = fs.readFileSync(__dirname + '/../sslCert/cert.pem')
const http = require("http").createServer(app);


socket(http);

dotenv.config();
class Server {
    public app: express.Application

    public  constructor(app: express.Application){
        this.app = app;
    }
    /**
     * start
     */
    public start(): void {
        
     http.listen(this.app.get("port"), () => {
            console.log(
                "  App is running at http://localhost:%d in %s mode",
                this.app.get("port"),
                this.app.get("env")
            );
            console.log("  Press CTRL-C to stop\n");
        });
          
    }
}
/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
const server = new Server(app);
server.start();

let connections: any[] = [];

// setInterval(() => http.getConnections(
//     (err: any, connections: any) => console.log(`${connections} connections currently open`)
// ), 1000);

function shutDown() {
    console.log("Received kill signal, shutting down gracefully");
    http.close(() => {
        console.log("Closed out remaining connections");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000);

    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}
process.on("SIGTERM", shutDown);
process.on("SIGINT", shutDown);


http.on("connection", (connection: object|any) => {
    connections.push(connection);
    connection.on("close", () => connections = connections.filter(curr => curr !== connection));
});

export default server;