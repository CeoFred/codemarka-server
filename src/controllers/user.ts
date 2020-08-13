import { Request, Response, NextFunction } from "express";
import { User, UserDocument } from "../models/User";
import { successResponseWithData,ErrorResponse } from "../helpers/apiResponse";

/**
 * Get User Information
 */

export const getUserInfo =  (req: Request, res: Response): object => {
    const {kid}  = req.params;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    }

    User.findOne({kid},{"accountType":0,"status":0, "_id":0,"googleid":0,"tokens":0,"resetPasswordExpires":0,"resetPasswordToken":0}).then(user => {
        if (user) {
            return successResponseWithData(res,"Success", user);
        } else {
            return ErrorResponse(res,"Whoops! User not found");
        }
    }).catch(err => {
        return ErrorResponse(res,err);
    });
};


export const followUser = (req: Request, res: Response): object => {
    const {kid}  = req.params;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    }
};


export const unfollowUser = (req: Request, res: Response): object => {
    const {kid}  = req.params;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    }
};