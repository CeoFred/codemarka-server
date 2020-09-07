import { Request, Response, NextFunction } from "express";
import { User, UserDocument } from "../models/User";
import { successResponseWithData,ErrorResponse,successResponse } from "../helpers/apiResponse";

/**
 * Get User Information
 */

export const getUserInfo =  (req: Request, res: Response): object => {
    const {username}  = req.params;
    if(!username.length){
        return ErrorResponse(res,"User id required");
    }

    User.findOne({username},{"accountType":0,"status":0, "_id":0,"googleid":0,"tokens":0,"resetPasswordExpires":0,"resetPasswordToken":0}).then(user => {
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
    const requestUserKid = req.body.decoded.kid;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    } else {
        User.findOne({kid}).then(userData => {
            const userIsFollowing =  userData.followers.some((d) => {
                return d.kid === requestUserKid;
            });

            if(userIsFollowing){
                return successResponse(res,"Success");
            } else {
                userData.followers.push(req.body.decoded);
                userData.save((err, data) => {
                    if(err) ErrorResponse(res,"Failed to follow user");

                    User.findOne({kid: requestUserKid}).then((user) => {
                        if(user){
                            const usersIsFollowing =  user.following.some((d) => {
                                return d.kid === kid;
                            });
                            if(usersIsFollowing){
                                return successResponse(res,"Success");                
                            } else {
                                user.following.push({ kid: userData.kid, username: userData.username});

                                user.save();
                                return successResponse(res,"Success");
                            }
                        } else {
                            return ErrorResponse(res,"Request user not found");
                        }
                    });
                });
            }
        });
    }
};


export const unfollowUser = (req: Request, res: Response): object => {
    const {kid}  = req.params;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    }
};

export const specialUpdate = (req: Request, res: Response): void => {
    User.find({}).then(users => {
        let promises: any[] = [];
        let accty: any = [];
        users.map(user => {
            user.username = user.username.toLocaleLowerCase().replace(" ","_");
            user.profile.name = user.profile.name ? user.profile.name.toLocaleLowerCase().replace(" ","_") : ""; 
            user.email = user.email.toLocaleLowerCase();
            user.accountType = Number(user.accountType);
            promises.push(user.save());
            accty.push({username: user.username, accountType:typeof user.accountType});
        });
        // return successResponseWithData(res,"done",accty);

        Promise.all(promises)
            .then(resolved => {
                return successResponseWithData(res,"done",resolved);
            }).catch(err => {
                console.log(err);
                return ErrorResponse(res, err);
            });
    });
};