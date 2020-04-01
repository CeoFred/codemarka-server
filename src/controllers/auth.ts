/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import sgMail  from "@sendgrid/mail";
import { User, UserDocument } from "../models/User";
import { UserDeleted } from "../models/DeletedUsers";
import { Request, Response, NextFunction } from "express";
import { WriteError } from "mongodb";
import { validationResult } from "express-validator";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { successMessage } from "../helpers/response";
import { randomNumber,randomString } from "../helpers/utility";
// import {constants} from "../helpers/constants";

import jwt from "jsonwebtoken";
import * as apiResponse from "../helpers/apiResponse";
import * as CLIENT_URLS from "../config/url";


const options = { algorithm: "HS256", noTimestamp: false, audience: "users", issuer: "colab", subject: "auth", expiresIn: "7d" };
/** 
 *
 *Account recovery for user 
 * 
*/
export const accountRecovery = (req: Request, res: Response, next: NextFunction) => {
    const email: string =  req.body.email;
    
    if(!email){
        return apiResponse.ErrorResponse(res,"Email is required");
    }

    const formattedMail = String(email.trim());

    if(formattedMail !== ""){
        
        // validate email
        const EmailRegexPattern = new RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);

        if(!formattedMail.match(EmailRegexPattern)){
            return apiResponse.validationErrorWithData(res,"Invalid Email format",formattedMail);
        };
        // search email, update and send email
        
        User.findOne({email: formattedMail}).exec((err,resp) => {
            // console.log(err,res);
            let token = "";
            const buf = crypto.randomBytes(26);
            token = buf.toString("hex");
            let userid;
            if(resp){{
                userid = resp._id;
                if(resp.googleid !== "" && resp.googleid !== null && resp.googleid !== undefined){
                    return apiResponse.ErrorResponse(res,"Try logging in with a google account associated with this email");
                }
            }} else {
                return apiResponse.ErrorResponse(res,"Whoops! Email does not exits, try signing up.");
            }
            
            
            User.findByIdAndUpdate({ _id : userid },{ resetPasswordToken: token, resetPasswordExpires: Date.now() + 86400000  }, { upsert: true, new: true },(err,doc: UserDocument) => {
                if(err){
                    return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");
                }
                if(doc && doc !== null && doc !== undefined) {
                    const { username,_id:user } = doc;
                    let trial = 0;
                    let maxTrial = 2;
                    let sent = false;
                    const PasswordResetLink = `${req.hostname === "localhost" ? "http://localhost:3000" : "https://codemarka.dev"}/auth/user/account/password/reset/${token}/${user}`;
                    console.log(PasswordResetLink);
                    const sendPasswordResetMail = (email: string) => {

                        const trimedEmail = email.trim();

                        const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <div style="text-align:center">
                    </div>
                    <h4><b>Hi ${username},</b></h4>
                    <p>Let's help you reset your password so you can get back to collaborating and learning.</p>
                    <button type='button' style="
                        display: inline-block;
    font-weight: 600;
    text-align: center;
    vertical-align: middle;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    background-color: transparent;
    border: 1px solid transparent;
    padding: .75rem 1.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border-radius: .375rem;
    transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
    color: #fff;
    background-color: #2dca8c;
    border-color: #2dca8c;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.15);
"><a href='${PasswordResetLink}'>Password Reset</a></button>
                    <br/>
                    copy link below to your browser if button above does not work on your device.
                    ${PasswordResetLink}

                    <br/>

                    </div>

                    `;

                        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                        const msg = {
                            to: trimedEmail,
                            from: "no-reply@codemarak.dev",
                            subject: "Complete your password reset request",
                            text: `Click below to verify ${PasswordResetLink}`,
                            html: emailTemplate,
                        };

                        if(trial <= maxTrial && !sent){
                            try {
                                sgMail.send(msg,true,(err: any,resp: unknown) => {
                                    if(err){
                                    // RECURSION
                                        trial++;
                                        console.log("retrying..",trial);
                                        sent = false;
                                        sendPasswordResetMail(trimedEmail);
                                    } else {
                                
                                        // BASE
                                        console.log("sent mail to",trimedEmail);
                                        sent = true;
                                        return apiResponse.successResponse(res,"Please check your inbox.");
                                    }
                                
                                });
                            } catch (e) {
                                next(e);
                                return apiResponse.ErrorResponse(res,"Whoops!  Something went wrong");
                            }
                       
                        } else {
                        // TERMINATION
                            console.log("password reset mail exceeded trial");
                            sent = false;
                            return apiResponse.successResponse(res,"Please try again.");
                        }
                    };
                    sendPasswordResetMail(email);
                } else {
                    return apiResponse.ErrorResponse(res,"Account not found");

                }


            });
        });

    } else {
        return apiResponse.ErrorResponse(res,"Email is required");
    }

};

/**
 * Reset User password by creating a new password
 */
export const passwordReset = (req: Request | any, res: Response) => {
    const newPassword = (req.body.nPass);
    const newPassword2 = req.body.nPass2;

    const token = req.body.token;
    const userId = req.body.user;

    if(newPassword && String(newPassword).trim() !== ""){
        if(!token){
            return apiResponse.ErrorResponse(res,"Token not found");
        }

        if(!userId){
            return apiResponse.ErrorResponse(res,"User id not found");
        }

        if(newPassword !== newPassword2){
            return apiResponse.ErrorResponse(res,"Passwords do not match");
        }

        User.findOne( {resetPasswordToken: req.body.token,
            resetPasswordExpires: {
                $gt: Date.now()
            }},(err,doc) => {

            if(err){
                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");
            }

            if(doc && doc !== null){
                try {
                    doc.password = newPassword;
                    doc.resetPasswordToken = "";
                    doc.resetPasswordExpires = "";
                    doc.save((err,user) => {
                        
                        if (err) {
                            return apiResponse.ErrorResponse(res,"Failed to update password");

                        } else {
                            
                            let trial = 0;
                            let maxTrial = 2;
                            let sent = false;
                            const sendMailToNewUser = (email: string) => {

                                const trimedEmail = email.trim();

                                const emailTemplate = `
	
<b>Password Change Confirmation</b>
<p>Your password was successfully changed.</p>

<p>Username	${email}</p>
<p>IP Address	${req.connection.remoteAddress || req.headers["x-forwarded-for"]}</p>
<p>Created	${new Date()}</p>
                    `;

                                sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                                const msg = {
                                    to: trimedEmail,
                                    from: "codemarka-support@codemarak.dev",
                                    subject: "Password reset Confirmation",
                                    text: "password reset confirmation",
                                    html: emailTemplate,
                                };

                                if(trial <= maxTrial){
                                    try {
                                        sgMail.send(msg,true,(err: any,resp: unknown) => {
                                            if(err){
                                                // RECURSION
                                                trial++;
                                                console.log("retrying..",trial);
                                  
                                                sendMailToNewUser(trimedEmail);
                                            } else {
                                
                                                // BASE
                                                console.log("sent mail to",trimedEmail);
                                                sent = true;
                                                return apiResponse.successResponse(res,"Password reset successful");     

                                            }
                                
                                        });
                                    } catch (e) {
                                        console.log(e);
                                        return apiResponse.ErrorResponse(res,"Whoops!  Something went wrong");

                                    }
                       
                                } else {
                                    // TERMINATION
                                    console.log("exceeded trial");
                                    sent = false;
                                    return apiResponse.successResponse(res,"Hurray! One last thing, we sent a confirmation mail , please check your inbox.");
                                }
                    

                            };
                            sendMailToNewUser(doc.email);
                        }
                    });
                } catch (error) {
                    console.log(error);
                    return apiResponse.ErrorResponse(res,"Error updating password");
                }
            } else {
                return apiResponse.ErrorResponse(res,"Invalid or expired token");
            }
        });
    } else {
        return apiResponse.ErrorResponse(res,"New password not set");
    }


};
/**
 * Verify email using token
 */
export const tokenVerify = (req: Request, res: Response, next: NextFunction) => {
    
    const t = req.body.token;
    const uI = req.body.user;

    User.findOneAndUpdate({_id:uI,emailVerificationToken:t},{emailVerified:true,emailVerificationToken:null}, (err, user) => {

        if(err){
            return apiResponse.ErrorResponse(res, "Wboops something went wrong");
        } else {
            
            if (user === null){
                return apiResponse.ErrorResponse(res,"No User Found");
            }

            if (user && uI == user._id) {
                
                
                return apiResponse.successResponse(res,"Token verification success");

            }else {
                return apiResponse.ErrorResponse(res,"failed");
            }


        }
    });
};

/**
 * Verify user authrication token
 */
export const userAuthtokenVerify = (req: Request, res: Response, next: NextFunction) => {
    try{
        const { _id } = req.body.decoded;
        User.findOne( {_id}, (err, user) => {
            if(err){
                return apiResponse.ErrorResponse(res, "Wboops something went wrong");
            } else {
                if (user === null){
                    return apiResponse.ErrorResponse(res,"No User Found");
                }
                const userObject = {
                    email: user.email,
                    username: user.username,
                    _id: user._id
                };
                return apiResponse.successResponseWithData(res,"success",userObject);
            }
        });
    }
    catch {
        return apiResponse.ErrorResponse(res,"Something went wrong");
    } 
};

export const postLogin = (req: Request, res: Response) => {

    try {
  
        const errors = validationResult(req);
        const ip = req.connection.remoteAddress || req.headers["x-forwarded-for"];

        if (!errors.isEmpty()) {
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
                            if(user.isConfirmed){
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
                                        expiresIn: process.env.JWT_TIMEOUT_DURATION || "10days",
                                    };

                                    const secret = process.env.JWT_SECRET;
                                    //Generated JWT token with Payload and secret.
                                    userData.token = jwt.sign(jwtPayload, secret, jwtData);

                                    user.updateAfterLogin(ip,{accessToken:userData.token,type: "login"});

                                    // integrate IP change later
                                 
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
                    return apiResponse.unauthorizedResponse(res, "Email does not exist, try signing up");
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
            const { email, password, username, techStack } = req.body;
            	// generate OTP for confirmation
            let otp = randomNumber(4);
            const verificationToken = randomString(70);

            User.findOne({email},(err,userf) => {
                if (err) { return apiResponse.ErrorResponse(res, err); }

                if(userf){
                    return apiResponse.ErrorResponse(res, "Email already exists,try logging in");
                }
            });
            var user = new User(
                {
                    username,
                    email,
                    confirmOTP: otp,
                    isConfirmed: false,
                    status:1,
                    emailVerificationToken:verificationToken,
                    techStack:techStack || "",
                    kid: randomNumber(40)
                }
            );
            user.gravatar(20);
            user.password = password;


            user.save(function (err,data) {
                if (err) { return apiResponse.ErrorResponse(res, err); }
                
                let trial = 0;
                let maxTrial = 2;
                let sent = false;
                const vLink = `https://code-maraka.herokuapp.com/auth/account/user/verify/${verificationToken}/${user._id}`;
                console.log(vLink);
                const sendMailToNewUser = (email: string) => {

                    const trimedEmail = email.trim();

                    const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <h4><b>Hi ${username},</b></h4>
                    <br/>

                    <p>Please verify your email address used in creating an account on codemarka.
                    Click on the link below to activate your account.
                    </p>

                    <br/>

                    <p><a href='${vLink}'>${vLink}</a></p>
                    </div>

                    `;

                    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                    const msg = {
                        to: trimedEmail,
                        from: "Codemarka@codemarak.dev",
                        subject: "Verify Your Email",
                        text: `Click below to verify ${vLink}`,
                        html: emailTemplate,
                    };

                    if(trial <= maxTrial){
                        try {
                            sgMail.send(msg,true,(err: any,resp: unknown) => {
                                if(err){
                                    // RECURSION
                                    trial++;
                                    console.log("retrying..",trial);
                                  
                                    sendMailToNewUser(trimedEmail);
                                } else {
                                
                                    // BASE
                                    console.log("sent mail to",trimedEmail);
                                    sent = true;
                                    console.log(user);
                                    return apiResponse.successResponse(res,"Hurray! One last thing, we sent a confirmation mail , please check your inbox.");

                                }
                                
                            });
                        } catch (e) {
                            next(e);
                            console.log(e);
                            return apiResponse.ErrorResponse(res,"Whoops!  Something went wrong");

                        }
                       
                    } else {
                        // TERMINATION
                        console.log("exceeded trial");
                        sent = false;
                        return apiResponse.successResponse(res,"Hurray! One last thing, we sent a confirmation mail , please check your inbox.");
                    }
                    

                };
                sendMailToNewUser(email);
            });

        }

        
    } catch (error) {

        return apiResponse.ErrorResponse(res, error);
        
    }
        
};

export const handelGoogleAuthCallback  = (req: any | Request, res: Response) => {
    
    const user =  req.user._id;
    const username = req.user.username;
    console.log(req.user);

    let userData = {
        _id: user,
        username: username
    };
    //Prepare JWT token for authentication
    const jwtPayload = userData;

    const jwtData = {
        expiresIn: process.env.JWT_TIMEOUT_DURATION,
    };

    const secret = process.env.JWT_SECRET;
    //Generated JWT token with Payload and secret.
    const token  = jwt.sign(jwtPayload, secret, jwtData);

    return res.redirect(`${CLIENT_URLS.GOOGLE_AUTH_SUCCESS_CLIENT}/${token}/${user}`);
};


export const emailVerification = (req: Request, res: Response, next: NextFunction) => {
    const userid = req.params.user;
    const token = req.params.token;

    if(userid && userid.trim().length >= 23){
        try {
            let trial = 0;
            let maxTrial = 2;
            let sent = false;
            User.findOne({_id: userid, emailVerificationToken: token,isConfirmed: false},(err, user) => {
                console.log(user);
                if(user !== null){

                    console.log("found");

                    user.emailConfirmed();
                    const username = user.username;
                    //send Welcome mail;
                    const sendWelcomeEmailToUser = (email: string) => {

                        const trimedEmail = email.trim();

                        const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <div style="text-align:center">
                    <img src='https://lh3.googleusercontent.com/7mQ4OCDZ1mOyQu1KvJI9NaVXQgLWgX8cvLI6yrDQKfAc-pwp3fcbQPlZfy9uKJUFWBcPpGd-8bJ-9YH60zVN3u9fj81cb2YUhJPShVoe5BzlSpF7lOzbi0hZfg6gn61t9u-OdoFju6rgursXBLyJjCrDIf-gU0AibNf3qjXV0aHJS8wg_KKEI_ExXEnXwtM_JSxthMKSt_9ef-KiG107dTri1sbk74yAyvTiDqcAIozThAbt47gLH1fCLU4Ngx3Mze2lgv3Ed3DsUbtESKV5cpJEkrwAr1dfepXgoKviLzzECuEneLkgkOtSRcmIshZjGMuxY9HzMjcyZQ1tf07aqpnsZ2Mg-IfU5QQQ2pF9AghJbR7pJlNvedBI6rfeo1yP9EEFSsR1ShAR3LZnybR2mw--43AABZRer4DX6T7ZUNA_hxSRvy6i3VsBhkSeZ7bUfkkOzg3RoH8hjbAdKgi4aUXpjFTOWd4vru-u7eTbdcjuYglvRIYvTDu_SZaJne3H25aZbxbmYTUSc6SFla6XIk1x1tH0uNC6D3joQLH-g3pOkmR9CfHRXqp-v2NhCmkrs9tlNjlvSvujqdL3-aZ4ogL8GcQzBpysiCfFbM32QI47w8G5qGKKc4HSPt-MNLRC0Hi56CrWjSLhxMCYraWecUvDIdlwMQolhjydLCtCWFgQ4DhClYQ-1Q=s298-no' height="100" width="100"/>
                    </div>
                    <h4><b>Hey ${username},</b></h4>
                    <br/>

                    <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                    codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                    from your homepage, all the best!
                    </p>

                    <br/>
                    <p><a href='https://codemarka.dev/auth/signin?ref=confirm'>Login</a></p>
                    </div>

                    `;

                        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                        const msg = {
                            to: trimedEmail,
                            from: "Codemarka@codemarak.dev",
                            subject: "Welcome To Codemarka",
                            text: "Welcome to codemarka!",
                            html: emailTemplate,
                        };

                        if(trial <= maxTrial){
                            try {
                                sgMail.send(msg,true,(err: any,resp: unknown) => {
                                    if(err){
                                    // RECURSION
                                        trial++;
                                        console.log("retrying..",trial);
                                  
                                        sendWelcomeEmailToUser(trimedEmail);
                                    } else {
                                
                                        // BASE
                                        console.log("sent mail to",trimedEmail);
                                        sent = true;
                                        console.log(user);
                                        return res.redirect("https://codemarka.dev/account/confirmed/true/?sent=true");
                                    }
                                
                                });
                            } catch (e) {
                                next(e);
                                console.log(e);

                                return res.redirect("https://codemarka.dev/account/confirmed/true/?sent=false");

                            }
                       
                        } else {
                        // TERMINATION
                            console.log("exceeded trial");
                            sent = false;
                            return res.redirect("https://codemarka.dev/account/confirmed/true/?sent=false");
                        }
                    

                    };
                    sendWelcomeEmailToUser(user.email);
                } else {
                    return res.redirect("https://codemarka.dev/account/confirmed/false/?sent=false&info=0");

                }
            });
        } catch (error) {

            return res.redirect("https://codemarka.dev/account/confirmed/false/?sent=false&info=0");

        }
    } else {
        return res.redirect("https://codemarka.dev/pages/error/?email_ver=false&info=0");


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


export const logout = async (req: Request,res: Response) => {
    
    const { _id } = req.body.decoded;
    const otoken = req.body.token;
    
    User.findOne({ _id:_id },(err,user) => {
        if(err) return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");
        if(user && user !== null) {
            let tokens = user.tokens;

            tokens = tokens.filter(token => {
                return token.accessToken !== otoken && token.type;
            });

            User.findByIdAndUpdate(_id,{tokens},(err,user) => {
                if (err) return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");

                return apiResponse.successResponse(res,"Logged out successfully");
            });
        }
    });

    // User.findByIdAndUpdate();
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