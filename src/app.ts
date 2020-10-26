/* eslint-disable @typescript-eslint/explicit-function-return-type */
import express from "express";
import compression from "compression"; 
import bodyParser from "body-parser";
import lusca from "lusca";
import methodOverride from "method-override";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import connectStore from "connect-mongo";
import mongoose from "./config/db";
import cookieParser from "cookie-parser";
import { SESS_NAME, SESS_SECRET , SESS_LIFETIME } from "./util/secrets";

import auth from "./routes/auth";
import classroom from "./routes/classroom";
import community from "./routes/community";
import user from "./routes/user";

import { NextFunction, Request, Response } from "express";
import uuid from "uuid";

const MongoStore = connectStore(session);

// Create Express server
const app = express();

const whitelist = ["http://localhost:2001/", "http://localhost:3000", "https://codemarka.dev", "https://cmarka.xyz","https://localhost:3006", "https://sandbox.codemarka.dev"];
const corsOptions = {
    origin(origin: string, callback: Function) {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
};

/**
 * API keys and Passport configuration.
 */


app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cookieParser());

app.use(session({
    name: SESS_NAME,
    secret: SESS_SECRET,
    saveUninitialized: true,
    resave: false,
    store: new MongoStore({
        mongooseConnection: mongoose,
        collection: "session",
        ttl: (SESS_LIFETIME) / 1000
    }),
    genid: function (req) {
        return uuid.v4();
    },
    // cookie: {
    //     secure: true,
    //     maxAge: (SESS_LIFETIME),
    //     httpOnly: true,
    //     sameSite: false,
    // }
}));
require("./config/passport");

app.use(passport.initialize());
app.use(passport.session());

app.set("host", process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");
app.set("port", process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);

app.use(methodOverride());
app.use(cors({credentials: true, origin: ["http://localhost:3000","https://codemarka.dev","https://sandbox.codemarka.dev"]}));

app.use(lusca.xframe("SAMEORIGIN"));
app.disable("x-powered-by");

app.use(lusca.xssProtection(true));
// app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

app.use((req, res,next) => {
    console.log(req.session.user);
    next();
});
// routes as middlewares
app.use("/api/v1/auth", auth);
app.use("/api/v1/classroom", classroom);
app.use("/api/v1/community" ,community);
app.use("/api/v1/user", user);

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
interface Error {
    [x: string]: string;
    name: string;
    message: string;
    stack?: string;
    provider?: string;
}

function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (res.headersSent) {
        return next(err);
    }
    return res.json(err);
}

function fourofour(req: Request, res: Response) {
    res.status(404).json({ status: "failed", error: "Sorry can't find that!" });
}
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);
app.use(fourofour);
export default app;