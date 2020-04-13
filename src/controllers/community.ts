/* eslint-disable @typescript-eslint/camelcase */
import { Request, Response, NextFunction } from "express";
import cloudinary  from "cloudinary";
import { WriteError } from "mongodb";
import { validationResult } from "express-validator";

import * as apiResponse from "../helpers/apiResponse";
import { CommunityDocumentTemp, CommunityTemp } from "../models/CommunityTemp";
import { CommunityDocument, Community } from "../models/Community";

import { randomString } from "../helpers/utility";

const cloudi = cloudinary.v2;

cloudi.config({ 
    cloud_name: "ogwugo-people", 
    api_key: "884434965257465", 
    api_secret: "dk_QJWS3eBrzBWNo_xjN1RHz1AI" 
});
export const uploadCommunityLogo = ( req: Request,res: Response ): object => {
    console.log(req.body);
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

        communityAccount.save((err: WriteError, response: CommunityDocumentTemp) => {
            if(err) {
                console.log(err.errmsg);
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
                console.log(err.errmsg);
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.organizers.lead.email = req.body.organizerOneEmail;
                response.organizers.lead.fullname = req.body.organizerOneFullName;
                response.organizers.coLead.email = req.body.organizerTwoEmail;
                response.organizers.coLead.email = req.body.organizerTwoFullName;

                response.save((err: WriteError,updatedTemp: CommunityDocumentTemp) => {
                    if(err) {
                        console.log(err.errmsg);
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        console.log(updatedTemp);
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
    try {
        CommunityTemp.findOne({kid:req.params.kid},(err, response) => {
            if(err) {
                console.log(err.errmsg);
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.physicalAddress = req.body.address;
                response.email = req.body.email;
                response.telephone = req.body.telephone;

                response.save((err: WriteError,updatedTemp: CommunityDocumentTemp) => {
                    if(err) {
                        console.log(err.errmsg);
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        console.log(updatedTemp);
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
                // console.log(result);
                CommunityTemp.findOne({kid:req.params.kid},(err, response) => {
                    if(err) {
                        console.log(err.errmsg);
                        return apiResponse.ErrorResponse(res,"Could not retrieve data");
                    }
                    if(response){
                
                        response.Logo = image;
               

                        response.save((err: WriteError,updatedTemp: CommunityDocumentTemp) => {
                            if(err) {
                                console.log(err.errmsg);
                                return apiResponse.ErrorResponse(res,"Error updating data");
                            }
                            if(updatedTemp){
                                console.log(updatedTemp);
                                return apiResponse.successResponseWithData(res,"success",updatedTemp.kid);
                            }
                        });
                    } else {
                        return apiResponse.ErrorResponse(res,"Temp data not found");
                    }

                });
            }).catch(err => {
            // console.log(err);
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
                console.log(err.errmsg);
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                
                response.meetupLink = req.body.meetupUrl;
                response.instagramLink = req.body.instagramUrl;
                response.facebookUrl = req.body.facebookUrl;
                response.twitterUrl = req.body.twitterUrl;
                response.save((err: WriteError,updatedTemp: CommunityDocumentTemp) => {
                    if(err) {
                        console.log(err);
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        console.log(updatedTemp);
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
    try {
        CommunityTemp.findOne({kid:communityKid},(err, response) => {
            if(err) {
                console.log(err.errmsg);
                return apiResponse.ErrorResponse(res,"Could not retrieve data");
            }
            if(response){
                response.completed = true;
                response.save((err: WriteError,updatedTemp: CommunityDocumentTemp) => {
                    if(err) {
                        console.log(err);
                        return apiResponse.ErrorResponse(res,"Error updating data");
                    }
                    if(updatedTemp){
                        console.log(updatedTemp);
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