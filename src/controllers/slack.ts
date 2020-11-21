import { Request, Response, NextFunction } from "express";
import { createClassRoom } from "./classroom";
export const createRoom = (req: Request, res: Response): any => {
    console.log(req.body);
    return createClassRoom(req, res);
};
