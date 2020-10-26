import {NextFunction, Response, Request} from "express";

export const isAuth = (req: Request, res: Response, next: NextFunction): any => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).json({ msg: "You are not authorized to view this resource" });
    }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): any => {
    if (req.isAuthenticated() && req.user) {
        next();
    } else {
        res.status(401).json({ msg: "You are not authorized to view this resource because you are not an admin." });
    }
};