import express from "express";
import compression from "compression";  // compresses requests
import bodyParser from "body-parser";
import lusca from "lusca";
import path from "path";
import methodOverride from "method-override";
import cors from "cors";
import "./config/db";

// Controllers (route handlers)

import auth from "./routes/auth";
import classroom from "./routes/classroom";

import { NextFunction, Request, Response } from "express";

// Create Express server
const app = express();

// const whitelist = ["http://localhost:3000", "http://localhost:3001", "*"];
// const corsOptions = {
//     origin(origin: string, callback: Function) {
//         if (whitelist.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error("Not allowed by CORS"));
//         }
//     }
// };


// Express configuration
app.set("port", process.env.PORT || 8000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(compression());
app.use(methodOverride());
app.use(cors());

app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

// routes as middlewares
app.use("/auth", cors(), auth);
app.use("/classroom", classroom);


app.get("/", (req, res) => {
    res.json({ message: "Looking for something??" });
});



// middleware for errors

function clientErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (req.xhr) {
        res.status(500).json({ error: "Something failed!" });
    } else {
        next(err);
    }
}

function logErrors(err: Error, req: Request, res: Response, next: NextFunction) {
    console.error(err.stack);
    next(err);
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500);
    res.json({ error: err });
}

function fourofour(req: Request, res: Response) {
    res.status(404).json({ status: "failed", error: "Sorry can't find that!" });
}

app.use(logErrors);
app.use(clientErrorHandler);

app.use(errorHandler);
app.use(fourofour);
export default app;