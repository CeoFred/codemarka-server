import fs from "fs";
// import path from "path";
import {  Request, Response,NextFunction } from "express";
import { validationResult } from "express-validator";

import {Classroom, ClassroomDocument} from "../models/classroom";
import {randomNumber} from "../helpers/utility";
import {successResponseWithData} from "../helpers/apiResponse";
import {classWeb} from "../models/classWebFiles";
import * as apiResponse from "../helpers/apiResponse";

// const created = 1;
const creating = 2;

export const createClassRoom = (req: Request, res: Response, next: NextFunction): any => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(403).json({ errors: errors.array() });
    }

    const { name, topic, startTime, startDate, description, clsasType, classVisibility } = req.body;
    // get user id and compare with json decoded token sent
    const userid: string = req.body.decoded._id;

    const newclassroom = new Classroom({
        name,
        topic,
        description,
        classVisibility,
        clsasType,
        startTime,
        startDate,
        status: creating,
        owner:userid
    });
    newclassroom.save().then((data: { _id: any}) => {
        const jsfile = randomNumber(15);
        const htmlfile = randomNumber(15);
        const cssfile = randomNumber(15);


        // create editors for class
        const dire =  `${__dirname}/../classroomFiles/${data._id}/`;
        const jsSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.js`;
        const cssSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.css`;
        const htmlSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.html`;

        if(!fs.existsSync(dire)){
        
            fs.mkdir(dire, { recursive: true } ,(err) => {
            

                if (!err) {
                    console.log(`Directory created - ${dire}`);
                    
                    fs.copyFile(jsSource,`${dire}/${jsfile}.js`,(err) => {
                        if(err) next(err);
                    });
                    fs.copyFile(htmlSource,`${dire}/${htmlfile}.html`,(err) => {
                        if(err) next(err);
                    });
                    fs.copyFile(cssSource,`${dire}/${cssfile}.css`,(err) => {
                        if(err) next(err);
                    }); 
                } else {

                    return next(err);
                }
            });
            new classWeb({classroomId: data._id,js:jsfile,css: cssfile, html: htmlfile}).save().then((fdata) => {
                
                successResponseWithData(res,"success",data);

            }).catch(err => {
                return next(err);
            });
        }

    }).catch((err: any) => next(err.message));

};

// export const getDetails = (req: Request, res: Response) => {
//     const id = req.params.id;
//     Classroom.findById(id)
//         .exec()
//         .then((data: any) => {
//             return  res.status(200).json(data);
//         })
//         .catch((err: any) => {
//             return res.status(500).json({
//                 error: err
//             });
//         });

// };

// export const getClassroomFromLocation = (req: Request, res: Response) => {
//     const location = req.params.location;
//     // res.json({location})
//     Classroom.find({ location }).exec().then((data: object) => res.json({ data })).catch((err: any) => res.status(404).json(err));
// };


export const verifyClassroom = (req: Request, res: Response ,next: NextFunction): any => {

    const {classroomId} = req.body;
    Classroom.findOneAndUpdate({_id:classroomId},{$inc: {visits: 1}}).then(d => {
        if(d){
            return apiResponse.successResponseWithData(res,"success",d);
        }else {
            return apiResponse.ErrorResponse(res,"class verification failed");
        }
    }).catch(e => {
        return next(e);
    });
};

exports.endClassPermanently = (req: Request, res: Response) => {
    const id = req.params.classroomid;
    Classroom.deleteOne({ _id: id }).exec()
        .then((result: object) => {
            res.status(200).json({
                message: "Classroom Ended",
                result
            });
        })
        .catch((err: any) => {
            res.status(500).json({
                message: err
            });
        });
};

export const getTrending = (req: Request, res: Response): any => {
    Classroom.find({status:2,classVisibility:"Public"}).sort({visits:-1}).then(d => {
        return apiResponse.successResponseWithData(res,"Success",d);

    }).catch(e => {
        return apiResponse.ErrorResponse(res,e);
    });
};

const generateShortUrl = (): string => {
    return  `https://tinycloab.herokuapp.com/${randomNumber(6)}`;
};
// shorten classroom links
export const shortenClassLinks = (req: Request, res: Response, next: NextFunction): any => {
    const {classid} = req.params;
    const shortly = generateShortUrl();
    if(classid && classid.trim() !== "" && classid.length > 23){
        Classroom.findOneAndUpdate({_id:classid},{$set:{shortUrl: shortly}},{new:true},(err,doc) => {
            if(err){
                return next(err);
            }
            if(doc && doc !== null){
                return apiResponse.successResponseWithData(res,"success",shortly);
            } else {
                return apiResponse.ErrorResponse(res,null);
            }
        });
    } else {

    }
};

// verify if a classroom belongs to a user
export const verifyUserClassroom = (req: Request, res: Response, next: NextFunction): any => {
    const {classid, userid} = req.params;
    
    if(classid && classid.trim() !== ""
     && userid && userid.trim() !== "" 
     && classid.length > 23
     && userid.length > 23){
        Classroom.findById(classid,(err,doc: ClassroomDocument) => {
            if(err){
                return next(err);
            } 
            if(doc && doc !== null){
                if(doc.owner === userid){
                    return apiResponse.successResponse(res,"sucess verifying");
                } else {
                    return apiResponse.unauthorizedResponse(res,"failed verification");
                }
            } else {
                return apiResponse.ErrorResponse(res,doc);
            }
        });
    } else {
        return apiResponse.ErrorResponse(res,"Missing or invalid request parameters");
    }

};

// fetch all classroom by user
export const getUserClassrooms = (req: Request, res: Response,next: NextFunction): any => {
    const { userid } = req.params;

    Classroom.find(({owner:userid}),"classType numberInClass status visits likes topic description location",(err: Error,doc: ClassroomDocument) => {
        if(err){
            return next(err);
        }
        if(doc && doc !== null){
            return apiResponse.successResponseWithData(res,"success",doc);
        } else {
            return apiResponse.ErrorResponse(res,null);
        }
    });
};

exports.updateClassInformation = (req: Request, res: Response) => {

    const id = req.params.classroomID;
    const updateOps: any = {};
    for (const ops of req.body) {
        updateOps[ops.propName] = ops.value;
    }

    Classroom.update({ _id: id }, { $set: updateOps })
        .exec()
        .then(() => {
            res.status(200).json({
                message: "Classroom Upated",
                request: {
                    type: "GET",
                    url: "http://localhost:3000/classroom/preview/" + id
                }
            });
        })
        .catch((err: any) => {
            res.status(500).json({
                message: err
            });
        });

};
