/* eslint-disable @typescript-eslint/camelcase */
import { Request, Response, NextFunction } from "express";
import cloudinary  from "cloudinary";
import mongoose from "mongoose";
import { WriteError } from "mongodb";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";

import * as apiResponse from "../helpers/apiResponse";
import { CommunityTempDocument, CommunityTemp } from "../models/CommunityTemp";
import { CommunityDocument, Community } from "../models/Community";
import { Classroom, ClassroomDocument } from "../models/classroom";
import { User } from "../models/User";
import { randomString } from "../helpers/utility";
import { COMMUNITY_LOGIN } from "../config/url";
import { sendMail } from "../config/mailer";

const cloudi = cloudinary.v2;

cloudi.config({ 
    cloud_name: "codemarka", 
    api_key: "831423733611478", 
    api_secret: "EsmTcI2hBcDKLRzYwxkEuxopU4o" 
});
const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

const serverHost = prod ? "https://code-marka.herokuapp.com" : "http://localhost:2001";
const clientHost = prod ? "https://codemarka.dev" : "http://localhost:3000";


export const uploadCommunityLogo = ( req: Request,res: Response ): object => {
    return apiResponse.successResponse(res,"Reached");

};
/**
 * Route handler to save community Information Data temporarily
 */
export const communityInfoTemp = ( req: Request,res: Response ,next: NextFunction): object|void => {

    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return apiResponse.ErrorResponse(res,errors.array());
        }
        const { communityName, communityAcronym, communityWebsite, communityAffiliation, communityCity, communityCountry } = req.body;
        const communityAccount = new CommunityTemp();
        communityAccount.kid = randomString(45);
        communityAccount.communityName = communityName;
        communityAccount.communityAcronym = communityAcronym;
        communityAccount.publicWebsite = communityWebsite;
        communityAccount.affiliation = communityAffiliation;
        communityAccount.city = communityCity;
        communityAccount.country = communityCountry;

        communityAccount.save((err: WriteError, response: CommunityTempDocument) => {
            if(err) {
                return apiResponse.ErrorResponse(res,"Could not save data");
            }
            if(response){
                return apiResponse.successResponseWithData(res,"success",response.kid);
            }
        });
    } catch (error) {
        return next(error);
    }
};

export const communityOrganizersTemp = ( req: Request,res: Response,next: NextFunction ): object|void => {
    try {
        CommunityTemp.findOne({kid:req.params.kid},(err, response) => {
            if(err) {
                (err.errmsg);
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.organizers.lead.email = req.body.organizerOneEmail;
                response.organizers.lead.fullname = req.body.organizerOneFullName;
                response.organizers.coLead.email = req.body.organizerTwoEmail;
                response.organizers.coLead.fullname = req.body.organizerTwoFullName;

                response.save((err: WriteError,updatedTemp: CommunityTempDocument) => {
                    if(err) {
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        return apiResponse.successResponseWithData(res,"success",updatedTemp.kid);
                    }
                });
            } else {
                return apiResponse.ErrorResponse(res,"Temp data not found");
            }

        });
    } catch (error) {
        return next(error);
    }
};

export const communityContactInformationTemp = ( req: Request,res: Response,next: NextFunction ): object|void => {
    const { address, email, telephone } = req.body;
    let trimedIndex;

    if([address,email,telephone].some((value,index) => {
        if(value.trim() === ""){
            trimedIndex = index;
            return true;
        }
    })){
        return apiResponse.ErrorResponse(res,"All fields are required");
    }    
    try {
        CommunityTemp.findOne({kid:req.params.kid},(err, response) => {
            if(err) {
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.physicalAddress = req.body.address;
                response.email = req.body.email;
                response.telephone = req.body.telephone;

                response.save((err: WriteError,updatedTemp: CommunityTempDocument) => {
                    if(err) {
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        return apiResponse.successResponseWithData(res,"success",updatedTemp.kid);
                    }
                });
            } else {
                return apiResponse.ErrorResponse(res,"Temp data not found");
            }

        });
    } catch (error) {
        return next(error);
    }
};

export const communityLogoTemp = (req: Request, res: Response): object|void => {
    const path = req.file.path;


    if(req.file){

        try {

           
            cloudi.uploader.upload(path).then(result => {
                const image= result.url;
                CommunityTemp.findOne({kid:req.params.kid},(err, response) => {
                    if(err) {
                        return apiResponse.ErrorResponse(res,"Could not retrieve data");
                    }
                    if(response){
                
                        response.logoUrl = image;
                        response.Logo = image;

               

                        response.save((err: WriteError,updatedTemp: CommunityTempDocument) => {
                            if(err) {
                                return apiResponse.ErrorResponse(res,"Error updating data");
                            }
                            if(updatedTemp){
                                return apiResponse.successResponseWithData(res,"success",updatedTemp.kid);
                            }
                        });
                    } else {
                        return apiResponse.ErrorResponse(res,"Temp data not found");
                    }

                });
            }).catch(err => {
                return apiResponse.ErrorResponse(res,err);

            });
        } catch (error) {
            
        }
    }
};

export const communitySocailMediaTemp = (req: Request, res: Response, next: NextFunction): object| void => {
    const communityKid = req.params.kid;
    try {
        CommunityTemp.findOne({kid:communityKid},(err, response) => {
            if(err) {
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.meetupLink = req.body.meetupUrl;
                response.instagramLink = req.body.instagramUrl;
                response.facebookUrl = req.body.facebookUrl;
                response.twitterUrl = req.body.twitterUrl;
                response.save((err: WriteError,updatedTemp: CommunityTempDocument) => {
                    if(err) {
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        return apiResponse.successResponseWithData(res,"success",updatedTemp.kid);
                    }
                });
            } else {
                return apiResponse.ErrorResponse(res,"Temp data not found");
            }

        });
    } catch (error) {
        return next(error);
    }
};

export const communityCreationFinal = (req: Request, res: Response, next: NextFunction): object | void => {
    const communityKid = req.params.kid;
    const password = req.body.communityPassword;
    const email = req.body.communityEmail;

    try {
        CommunityTemp.findOne({kid:communityKid},(err, response) => {
            if(err) {
                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong,try again.");
            }
            if(response){
                response.completed = true;
                response.password = password;
                response.email = email;
                response.save((err: WriteError,updatedTemp: CommunityTempDocument) => {
                    if(err) {
                        return apiResponse.ErrorResponse(res,"Whoops! Something went wrong, please contact support.");
                    } else if (updatedTemp) {
                        Community.findOne({email},(err,coummunityAccountFound) => {
                            if(coummunityAccountFound){
                                return apiResponse.ErrorResponse(res,"Account already exists with email");
                            } else if(!err && !coummunityAccountFound){
                                User.findOne({email},(err,userAccountFound) => {
                                    if(userAccountFound){
                                        return apiResponse.ErrorResponse(res,"Account already exists with email");
                                    } else if(!err && !userAccountFound) {
                                        const verificationToken = randomString(70);
                                        let communityAccount =  new Community(updatedTemp);
                                        communityAccount.kid = randomString(45);
                                        communityAccount.isConfirmed= false;
                                        communityAccount.status = true;
                                        communityAccount.isNew = true;
                                        communityAccount._id = mongoose.Types.ObjectId();
                                        communityAccount.emailVerificationToken = verificationToken;

                                        communityAccount.save((err,newCommunityAccount: CommunityDocument) => {
                                            if(err) apiResponse.ErrorResponse(res,"Whoops! Something went wrong, contact support.");
                        
                                            else if (newCommunityAccount){                            
                                                const vLink = `${serverHost}/community/account/verify/${verificationToken}/${newCommunityAccount.kid}`;
                                                console.log(vLink);
                                                const emailTemplate = `
                                        <div style="padding:20px;">
                                        <div style="width:100%;background-color: #273444!important;padding:30px;text-align:center;margin-bottom:30px">   
                                        <img style="height:auto;width:auto" src="https://res.cloudinary.com/ogwugo-people/image/upload/v1585816806/codemark__logo.png"/>
                                        </div>
                                            <h4><b>Hello ${newCommunityAccount.communityName},</b></h4>
                                            Welcome to Codemarka!
                                            <p>
                                             You've successfull created your community account,
                                             To continue with the set-up, please confirm that we got your email right by clicking the link below.
                                             If the link is not clickable, copy and paste the URL in a new browser window:
                                             </p>
                                             ${vLink}
                                            <p>
                                            The link is valid for 14 days, after that you will have to start the registration process from the beginning.
                                            <b>We assume this is your community's official email , we would communicate with you via this medium if need be.<b/>
                                            </p>
                                            If you did not request sign up to codemarka, you can safely ignore this email or visit <a href="https://codemarka.dev/?ref=mail">codemarka</a> to find out more about
                                            what we have to offer, it might interest you.
                                            <p>
                                        If you have any questions about the service, feel free to contact us anytime at support@codemarka.dev.
                                            </p>
                                            <p>
                        Thanks for joining Codemarka Pro!
                        </p>
                        <p>
                        Happy Learning,
                        </p>
                        <p>
                        The Codemarka Team
                        </p>
                        </p>
                        https://codemarka.dev
                        </p>
                        </div>
                                            `;
                                                sendMail(emailTemplate,"Complete Your Account set-up","codemarka@codemarka.dev",newCommunityAccount.email).then((sent: any) => {
                                                    return apiResponse.successResponse(res,"Done");
                                                }).catch((err: Error) => {
                                                    return apiResponse.successResponse(res,"Whoops! Something went wrong.");
                                                });

                                            } else {
                                                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong,please refresh the browser to fix.");
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }

                    
                    
                });
            } else {
                return apiResponse.ErrorResponse(res,"Whoops! Try refrfeshing this tab.");
            }

        });
    } catch (error) {
        return next(error);
    }
};

export const communityAccountLogin = (req: Request, res: Response): object => {

    try {
  
        const errors = validationResult(req);
        const ip = req.connection.remoteAddress || req.headers["x-forwarded-for"];

        if (!errors.isEmpty()) {
            return apiResponse.ErrorResponse(res,errors.array());
        }
        else {

            const { email, password } = req.body;
            Community.findOne({email}).then((user) => {
                if(user){
                    	//Compare given password with db's hash.
                    user.comparePassword(password,(err,same) => {
                        if(same){
                            //Check account confirmation.
                            if(user.isConfirmed){
                                // Check User's account active or not.
                                let userData = {
                                    kid: user.kid,
                                    username: user.communityName,
                                    token:"",
                                    type:"community"
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

export const emailVerification = (req: Request, res: Response, next: NextFunction): object|void => {
    const kid = req.params.kid;
    const token = req.params.vid;

    if(kid && kid.trim().length >= 23){
        try {
            Community.findOne({kid, emailVerificationToken: token,isConfirmed: false},(err, user) => {
                
                if(err){
                    return apiResponse.ErrorResponse(res,"Something went wrong!");
                }
                if(user !== null){
                    const username = user.communityName;
                    //send Welcome mail;
                    const emailTemplate = `
                <div style="padding:20px;">
                <div style="width:100%;background-color: #273444!important;padding:30px;text-align:center;margin-bottom:30px">   
                <img style="height:auto;width:auto" src="https://res.cloudinary.com/ogwugo-people/image/upload/v1585816806/codemark__logo.png"/>
                </div>
                    
                    <h4><b>Hey ${username},</b></h4>
                    <br/>
                    <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                    codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                    from your homepage, all the best!
                    </p>
                    <p>Login here to access your dashboard <a href='${COMMUNITY_LOGIN}?ref=confirm'>Login</a></p>
                                        <p>
Thanks for joining Codemarka Pro!
</p>
<p>
Happy Learning,
</p>
<p>
The Codemarka Team
</p>
</p>
https://codemarka.dev
</p>
                    </div>

                    `;
                    user.isConfirmed = true;
                    user.emailVerificationToken = null;

                    user.save((err,doc) => {
                        if(doc){
                            sendMail(emailTemplate,"Welcome To Codemarka Pro","Community@codemarka.dev",user.email).then((sent: any) => {
                                return res.redirect(clientHost+"/auth/signin/?ref=mail&s=t");
                            }).catch((err: Error) => {
                                return res.redirect(clientHost+"/auth/signin/?ref=mail&s=f");
                            });
                        }  
                        if (err) {
                            return res.redirect(clientHost+"/auth/accounts/verification/failed");
                        } 
                    });
                    
                    
                } else {
                    return res.redirect(clientHost+"/account/confirmed/false/?sent=false&info=0&r=token-expired");
                }
            });
        } catch (error) {
            return res.redirect(clientHost+"/account/confirmed/false/?sent=false&info=0&r=null");
        }
    } else {
        return res.redirect(clientHost+"/pages/error/?email_ver=false&info=0");


    }

};


export const communityAuthtokenVerify = (req: Request, res: Response): object => {
    try{
        const { kid } = req.body;
        
        Community.findOne( {kid}, (err, community) => {
            if(err){
                return apiResponse.ErrorResponse(res, "Wboops something went wrong");
            } else {
                if (community === null){
                    return apiResponse.ErrorResponse(res,"Account not found");
                }
                const communityObject = {
                    email: community.email,
                    displayName: community.communityName,
                    displayImg: community.Logo || null,
                    kid: community.kid,
                    token: req.body.token,
                    accountType:102
                };
                return apiResponse.successResponseWithData(res,"success",communityObject);
            }
        });
    }
    catch {
        return apiResponse.ErrorResponse(res,"Something went wrong");
    } 
};

export const CommunityAuthLogout = (req: Request, res: Response): object| void => {
    const { kid } = req.body.decoded;
    const otoken = req.body.token;
    
    Community.findOne({ kid },(err,community) => {
        if(err) return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");
        if(community) {
            let tokens = community.tokens;

            tokens = tokens.filter(token => {
                return token.accessToken !== otoken && token.type;
            });

            Community.findOneAndUpdate(kid,{tokens},(err,community) => {
                if (err) return apiResponse.ErrorResponse(res,"Whoops! Something went wrong");

                return apiResponse.successResponse(res,"Logged out successfully");
            });
        } else {
            return apiResponse.successResponse(res,"Logged out successfully");
        }
    });
};


export const getCommunities = (req: Request, res: Response): void => {
    Community.find({}).sort({rating:1}).limit(10).exec((err, comm) => {
        if(err){
            return apiResponse.ErrorResponse(res,"Something went wrong");
        }
        if(comm){
            let communities: any[] = [];
            communities = comm.map((c: CommunityDocument) => {
                return {
                    name:c.communityName,
                    acronym: c.communityAcronym,
                    kid: c.kid,
                    rating: c.rating,
                    logo: c.logoUrl,
                    members: c.members,
                    reviews: c.reviews
                };
            });
            return apiResponse.successResponseWithData(res,"success", communities);

        }
    });
};

/**
 * Get a single community
 */
export const getCommunity = (req: Request, res: Response): void => {

    Community.findOne({kid: req.params.kid},{_id:0,tokens:0,updatedAt:0,accountType:0,isConfirmed:0,lastLoggedInIp:0,__v:0,resetPasswordToken:0}).exec((err, comm) => {
        if (err) {
            return apiResponse.ErrorResponse(res, "Something went wrong");
        }
        if (comm) {
            return apiResponse.successResponseWithData(res, "success", comm);
        }
        else {
            return apiResponse.ErrorResponse(res, "Not Found!");
        }
    });
};


/**
 * Join a community as a memeber
 *
 */
export const joinCommunity = (req: Request, res: Response): void => {

};


/**
  * 
  * Leave a community as a member
  */
export const leaveCommunity = (req: Request, res: Response): void => {

};

/**
   * Rate a community
   */

export const rateCommunity = (req: Request, res: Response): void => {

};

/**
    * Get classrooms by community
    * 
 */

export const getUpcomingClassroomByCommunity = (req: Request, res: Response): void => {
    const { kid } = req.params;

    Classroom.find(({ owner: kid, status: 1 }), "startTime shortUrl gravatarUrl classVisibility startDate topic description", (err: Error, doc: ClassroomDocument) => {
        if (err) {
            return apiResponse.ErrorResponse(res, "Whoops!"); 

        }
        if (doc && doc !== null) {
            return apiResponse.successResponseWithData(res, "success", doc);
        } else {
            return apiResponse.ErrorResponse(res, null);
        }
    });
};