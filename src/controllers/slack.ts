import { Request, Response, NextFunction } from "express";
import { createClassRoom } from "./classroom";
export const createRoom = (req: Request, res: Response): any => {
    console.log(req.body);
    return createClassRoom(req, res);
};


export const handleOauthRedirect = (req: Request, res: Response): any => {

    const host = req.hostname === "localhost" ? "http://localhost:2001" : "https://api.secure.codemarka.dev";

    const url =  `https://slack.com/oauth/v2/authorize?user_scope=users:read&scope=chat:write,commands,groups:read,channels:read&client_id=1021312075858.1524283231284&redirect_uri=${host}/api/v1/auth/user/slack/oauth/external?redirect=slack`;

    return res.status(302).redirect(url);
    
};