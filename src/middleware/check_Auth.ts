import {NextFunction, Response} from "express";
import jwt from "jsonwebtoken";

export const check = (req: any, res: Response, next: NextFunction)  => {
    let token;
    console.log(req.headers)
    if (req.body.token) {
        token = req.body.token;
    } else if (req.headers.authorization) {
        token = req.headers.authorization.split(" ")[1];
    }
    try {
        console.log(token)
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
