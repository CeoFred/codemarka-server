/* eslint-disable @typescript-eslint/explicit-function-return-type */
import express from "express";
import compression from "compression"; 
import bodyParser from "body-parser";
import lusca from "lusca";
import methodOverride from "method-override";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { NextFunction, Request, Response } from "express";
import uuid from "uuid";

import session from "express-session";
import connectStore from "connect-mongo";
// import passport from "passport";

import { SESS_NAME, SESS_SECRET , SESS_LIFETIME } from "./util/secrets";

import auth from "./routes/auth";
import classroom from "./routes/classroom";
import community from "./routes/community";
import user from "./routes/user";
import slack from "./routes/slack";


const MongoStore = connectStore(session);

// Create Express server
const app = express();
if (process.env.NODE_ENV !== "production") {
    const result = dotenv.config({ path: path.resolve(process.cwd(), `.env.${app.get("env").trim()}`)});
 
    if (result.error) {
        throw result.error;
    }
}
import mongoose from "./config/db";

app.use(compression());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
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
    genid: function () {
        return uuid.v4();
    },
    cookie: {
        secure: app.get("NODE_ENV") === "production",
        maxAge: (SESS_LIFETIME),
        httpOnly:true,
        sameSite: "lax"
    }
}));
// require("./config/passport");

// app.use(passport.initialize());
// app.use(passport.session());

app.set("host", process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0");

app.use(methodOverride());

const corsConfig =  {credentials: true, origin: ["http://localhost:3000","https://codemarka.codemon.me"]};

app.use(lusca.xframe("SAMEORIGIN"));
app.disable("x-powered-by");

app.use(lusca.xssProtection(true));
// routes as middlewares
app.use("/api/v1/auth",cors(corsConfig) ,auth);
app.use("/api/v1/classroom",cors(corsConfig), classroom);
app.use("/api/v1/community" ,cors(corsConfig),community);
app.use("/api/v1/user",cors(corsConfig), user);
app.use("/api/v1/slack", slack);

app.get("/mail", function (req, res) {
    return res.render("mail/collaborationInvitation");
});

app.get("/api/v1", (req, res) => {
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