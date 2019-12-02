import {NextFunction, Response, Request} from "express";
import jwt from "jsonwebtoken";

export const check = (req: Request, res: Response, next: NextFunction): void | object => {
    let token;
    if (req.body.token) {
        token = req.body.token;
    } else if (req.headers.authorization) {
        token = req.headers.authorization.split(" ")[1];
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.body.usertoken = jwt.decode(token);
        req.body.decoded = decoded;
    } catch (err) {
        return res.status(404).json({
            message: "Auth Failed",
            error:err
        });
    };
    next();
};
