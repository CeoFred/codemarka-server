import { User, UserDocument } from "../models/User";
import { UserDeleted } from "../models/DeletedUsers";
import { Request, Response, NextFunction } from "express";
import { WriteError } from "mongodb";
import { validationResult } from "express-validator";

import { failed, successData, successMessage } from "../helpers/response";
import { randomNumber } from "../helpers/utility";
// import {send as mailer } from '../helpers/mailer';
// import {constants} from "../helpers/constants";

import jwt from "jsonwebtoken";

import * as apiResponse from "../helpers/apiResponse";

const options = { algorithm: "HS256", noTimestamp: false, audience: "users", issuer: "colab", subject: "auth", expiresIn: "7d" };

/**
 * POST /login
 * Sign in using email and password.
 */

export const tokenVerify = (req: Request, res: Response, next: NextFunction) => {
    
    const t = req.body.token;
    const uI = req.body.user;

    jwt.verify(t, process.env.JWT_SECRET, (er: jwt.JsonWebTokenError, dcd: any) => {

        if(er){
            if(er.message === "jwt not active"){
                return apiResponse.ErrorResponse(res,"token expired");
            }
            return apiResponse.ErrorResponse(res, er);
        } else {
            
            User.findOne({_id:dcd._id}).then(ud => {

                if (ud === null){
                    return apiResponse.ErrorResponse(res,"No User Found");
                }

                if (ud && uI == ud._id) {
                            
                    return apiResponse.successResponseWithData(res,"Token verification success",ud);

                }else {
                    return apiResponse.ErrorResponse(res,"failed");
                }

            }).catch(er => {
                return next(er);
            });

        }
    });
};

export const postLogin = (req: Request, res: Response, next: NextFunction) => {

    try {
  
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // return res.status(422).json(failed(errors.array()));
            return apiResponse.ErrorResponse(res,errors.array());
        }
        else {

            const { email, password } = req.body;
            User.findOne({email}).then((user) => {
                if(user){
                    	//Compare given password with db's hash.
                    user.comparePassword(password,(err,same) => {
                        if(same){
                            //Check account confirmation.
                            if(!user.isConfirmed){
                                // Check User's account active or not.
                                if(user.status) {
                                    let userData = {
                                        _id: user._id,
                                        username: user.username,
                                        token:""
                                    };
                                    //Prepare JWT token for authentication
                                    const jwtPayload = userData;
                                    const jwtData = {
                                        expiresIn: process.env.JWT_TIMEOUT_DURATION,
                                    };

                                    const secret = process.env.JWT_SECRET;
                                    //Generated JWT token with Payload and secret.
                                    userData.token = jwt.sign(jwtPayload, secret, jwtData);
                                    return apiResponse.successResponseWithData(res,"Login Success.", userData);
                                }else {
                                    return apiResponse.unauthorizedResponse(res, "Account is not active. Please contact admin.");
                                }
                            }else{
                                return apiResponse.unauthorizedResponse(res, "Account is not confirmed. Please confirm your account.");
                            }
                        }else{
                            return apiResponse.unauthorizedResponse(res, "Email or Password wrong.");
                        }
                    });
                }
                else{
                    return apiResponse.unauthorizedResponse(res, "Email or Password wrong.");
                }
            }).catch(err => {
			    return apiResponse.unauthorizedResponse(res, "Email or Password wrong.");

            });
        }
    } catch(e){
        return apiResponse.ErrorResponse(res, e);
    }
};

/**
 * POST /signup
 * Create a new local account.
 */
export const postSignup = (req: Request, res: Response, next: NextFunction) => {
  
    try {
        
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // return res.status(422).json(failed(errors.array()));
            return apiResponse.ErrorResponse(res,errors.array());
        }else{
            const { email, password, username } = req.body;
            
            	// generate OTP for confirmation
            let otp = randomNumber(4);
        
            var user = new User(
                {
                    username,
                    email,
                    password,
                    confirmOTP: otp,
                    isConfirmed: true,
                    status:1
                }
            );


            user.save(function (err) {
                if (err) { return apiResponse.ErrorResponse(res, err); }
                let userData = {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    token:""
                };
                
                //Prepare JWT token for authentication
                const jwtPayload = userData;
                const jwtData = {
                    expiresIn: process.env.JWT_TIMEOUT_DURATION,
                };

                const secret = process.env.JWT_SECRET;
                //Generated JWT token with Payload and secret.
                userData.token = jwt.sign(jwtPayload, secret, jwtData);
                return apiResponse.successResponseWithData(res,"Registration Success.", userData);
            });

        }

        
    } catch (error) {

        return apiResponse.ErrorResponse(res, error);
        
    }
        
};

/**
 * POST /account/profile
 * Update profile information.
 */
export const postUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
    
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // return res.status(422).json(failed(errors.array()));
        return apiResponse.ErrorResponse(res,errors.array());
    }
    User.findById(req.body.user.id, (err, user: UserDocument) => {
        if (err) { return next(err); }
        user.email = req.body.email || "";
        user.name = req.body.name || "";
        user.gender = req.body.gender || "";
        user.location = req.body.location || "";
        user.save((err: WriteError) => {
            if (err) {
                return next(err);
            }
            res.status(200).json(successMessage("Profile information has been updated."));
        });
    });
};

/**
 * POST /account/password
 * Update current password.
 */
export const postUpdatePassword = (req: Request, res: Response, next: NextFunction) => {
    
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // return res.status(422).json(failed(errors.array()));
        return apiResponse.ErrorResponse(res,errors.array());
    }
    User.findById(req.body.user.id, (err, user: UserDocument) => {
        if (err) { return next(err); }
        user.password = req.body.password;
        user.save((err: WriteError) => {
            if (err) { return next(err); }
            res.status(200).json(successMessage("Password has been changed."));
        });
    });
};

/**
 * POST /account/delete
 * Delete user account.
 */
export const postDeleteAccount = (req: Request, res: Response, next: NextFunction) => {
    User.findOne({ _id: req.params.userId }, (err, userFound) => {
        if (err) { return next(err); }
        UserDeleted.create(userFound).then(done => {
            User.deleteOne({ _id: req.params.userId }, (err) => {
                if (err) { return next(err); }
                res.status(200).json(successMessage("Deleted Document Successfully"));
            });
        });
    });
};


export const logout = () => {

};

/**
 * POST /auth/token/refresh
 * @returns string
 * @param token string
 * @requires token
 * @method POST
 * @description Refresh a token
 */

export const refreshToken = (req: Request, res: Response) => {
    const oldToken = req.body.token;
    // const tokenGenerator = ;
    const refreshOptions = { verify: { audience: "users", issuer: "colab" } };
    const payload: any = jwt.verify(oldToken, process.env.JWT_SECRET_KEY, refreshOptions.verify);
    delete payload.iat;
    delete payload.exp;
    delete payload.nbf;
    delete payload.jti;
    delete payload.aud;
    delete payload.iss;
    delete payload.sub;
    const token2 = jwt.sign(payload, process.env.JWT_SECRET_KEY, options);
    res.status(201).json(successMessage(token2));
};  