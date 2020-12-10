import { Request, Response, NextFunction } from "express";
import { User, UserDocument } from "../models/User";
import { successResponseWithData,ErrorResponse,successResponse } from "../helpers/apiResponse";
// import { Classroom } from "../models/classroom";

export const getUserWithEmailOrUsername = (req: Request, res: Response): void => {
    
    const { emailOrUsername } =  req.params;

    const regex = `.*${emailOrUsername}.*`;

    User.find({ $or:[ {"username": { $regex:regex} }, {"email": { $regex: regex } } ], },{kid: true, username: true} ,(err, user: UserDocument[]) => {
        if(err){
            console.log(err);
            return successResponse(res,[]);
        }
        if(user){
            return successResponse(res, user);
        } else {
            return successResponse(res,[]);
        }  
    });
};
export const checkUsername = (req: Request, res: Response): object => {
    const { username } = req.query;
    if(username){
        User.find({ username: username}).then((username) => {
            if(username && username.length > 0){
                return successResponse(res,false);
            } else {
                return successResponse(res,true);

            }
        });
    } else {
        return ErrorResponse(res,"Invalid Username");
    }
};
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

                                user.save((err,updates) => {
                                    return successResponseWithData(res,"Success",data);
                                });
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
    const requestUserKid = req.body.decoded.kid;
    if(!kid.length){
        return ErrorResponse(res,"User id required");
    } else {
        User.findOne({kid}).then(userData => {
            const userIsFollowing =  userData.followers.some((d) => {
                return d.kid === requestUserKid;
            });

            if(!userIsFollowing){
                return successResponse(res,"Success");
            } else {
                const newUsersFollowers =  userData.followers.filter(d => d.kid !== requestUserKid);
                userData.followers = newUsersFollowers;
                userData.save((err, data) => {
                    if(err) ErrorResponse(res,"Failed to unfollow user");

                    User.findOne({kid: requestUserKid}).then((user) => {
                        if(user){
                            const usersIsFollowing =  user.following.some((d) => {
                                return d.kid === kid;
                            });
                            if(!usersIsFollowing){
                                return successResponse(res,"Success");                
                            } else {
                                const newUsersFollowing =  user.following.filter(d => d.kid !== kid);
                                user.following = newUsersFollowing;
                                user.save((err,updates) => {
                                    return successResponseWithData(res,"Success",data);
                                });
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

export const specialUpdate = (req: Request, res: Response): void => {
    User.find({}).then(users => {
        let promises: any[] = [];
        users.map(user => {
            user.username = user.username && user.username.toLocaleLowerCase().replace(" ","_");
            user.profile.name = user.profile.name ? user.profile.name.toLocaleLowerCase().replace(" ","_") : ""; 
            user.email = user.email && user.email.toLocaleLowerCase();
            user.accountType = Number(user.accountType);
            promises.push(user.save());
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

    // Classroom.find({}).then(rooms => {
    //     let promises: any[] = [];
    //     rooms.forEach(room => {
    //         // console.log(room);
    //         const messages =  room.messages;
    //         const newStructure=  messages.map((message: any) => {
               
    //             const regex = /\B\@([\w\-]+\s)/ig;
    //             const mentions = (String(message.msg).match(regex));

    //             return {
    //                 ...message,
    //                 isThread: message.isThread || false,
    //                 reactions:message.reactions || [],
    //                 isDeleted: message.isDeleted || false,
    //                 wasEdited:message.wasEdited || false,
    //                 editHistory: message.editHistory ||[],
    //                 mentions: mentions || [],
    //                 hashTags:[],
    //                 sent: true,
    //                 thread: message.thread ||[],
    //                 subscribers: message.subscribers ||[]
    //             };
    //         });
    //         room = room;
    //         room.isBroadcasting = false;
    //         room.owner = room.owner || "ANON";
    //         room.topic = room.topic || "NO TOPIC SET";
    //         room.name = room.name || "NO NAME SET";
    //         room.isTakingAttendance = room.isTakingAttendance || false;
    //         room.messages = newStructure;
    //         promises.push(room.save());
    //     });
    //     // return successResponseWithData(res,"done",accty);

    //     Promise.all(promises)
    //         .then(resolved => {
    //             return successResponseWithData(res,"done",resolved);
    //         }).catch(err => {
    //             console.log(err);
    //             return ErrorResponse(res, err);
    //         });
    // });
};