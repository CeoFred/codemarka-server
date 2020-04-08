import fs from "fs";
import archiver from "archiver";

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

import { Classroom, ClassroomDocument } from "../models/classroom";
import { classAliasUrl } from "../models/classAlias"; 
import { User, UserDocument } from "../models/User";
import { randomNumber ,randomString} from "../helpers/utility";
import { successResponseWithData } from "../helpers/apiResponse";
import { classWeb } from "../models/classWebFiles";
import * as apiResponse from "../helpers/apiResponse";
import * as modelHelper from "../helpers/userModel";

const notStarted = 1;
const started = 2;
const ended = 3;

const MAX_PRIVATE_CLASSROOM_REGULAR = 15;
const MAX_PRIVATE_CLASSROOM_PREMUIM = "unlimited";

const MAX_CASSROOM_MEMBERS_REGULAR = 100;
const MAX_CLASSROOM_MEMBERS_PREMUIM = 300;

const MAX_PUBLIC_CLASSROOMS = "unlimited";

export const createClassRoom = (req: Request, res: Response, next: NextFunction): object => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(403).json({ errors: errors.array() });
    }

    const { location, name, topic, startTime, startDate, description, classType, visibility } = req.body;
    

    const userid: string = req.body.decoded._id;

    // find user and validate classroom creation limit.
    let userAccountType,privateClassroomsCreated,user;

    try {
     
        modelHelper.findUser(userid).then((respo: UserDocument) => {

            if(respo){
                user = respo;
                if (user) {
                    userAccountType = user.accountType;
                    privateClassroomsCreated = user.privateClassCreated;
                } else {
                    return apiResponse.ErrorResponse(res,"User not found");
                }

                if (userAccountType && userAccountType === "regular") {

                    if (visibility === "Private") {
                        if (Number(privateClassroomsCreated) > MAX_PRIVATE_CLASSROOM_REGULAR) {
                            return apiResponse.ErrorResponse(res,"You have reached your max private classroom limit for your account");
                        }
                    }
                }

                
                const generateClassUrlAlias = (data: any): any => {
                    return new Promise((resolve,reject) => {
                        let rs = randomString(4);

                        classAliasUrl.findOne({shortUrl:`https://cmarka.xyz/${rs}`},(err, url) => {
                            if(err) reject("Something went wrong while searching for urlAlias");
                            if(url){
                            //url exists
                                resolve(generateClassUrlAlias(data));
                            } else {
                                const url = new classAliasUrl({Kid: randomNumber(29),shortUrl: `https://cmarka.xyz/${rs}`,classroomKid:data.Kid});
                                url.save((err,urlDoc) => {
                                    if(err) reject("Something went wrong while trying to save");
                                    resolve(`https://cmarka.xyz/${rs}`);
                                });
                            }
                        });
                    });
                };
                const newclassroom = new Classroom({
                    name,
                    Kid: randomString(40),
                    topic,
                    description,
                    classVisibility: visibility,
                    classType,
                    startTime,
                    startDate,
                    status: notStarted,
                    owner: userid,
                    location,
                    
                    maxUsers: userAccountType === "regular" ? MAX_CASSROOM_MEMBERS_REGULAR : MAX_CLASSROOM_MEMBERS_PREMUIM
                });

                newclassroom.gravatar(23);



                newclassroom.save().then((data: ClassroomDocument) => {
                    const jsfile = randomNumber(15);
                    const htmlfile = randomNumber(15);
                    const cssfile = randomNumber(15);

                    // create editors for class
                    const jsSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.js`;
                    const cssSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.css`;
                    const htmlSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.html`;
                    /// update user classrooms limit
                    if (visibility === "Public") {
                        User.findOneAndUpdate({_id: userid},{$inc: {publicClassCreated: 1}},(err,doc: UserDocument) => {
                            if(err){ 
                                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user public class created.");
                            }
                        });
                    } else {
                        User.findOneAndUpdate({_id: userid},{$inc: {privateClassCreated: 1}},(err,doc: UserDocument) => {
                            if(err){ 
                                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user private class created");
                            }
                        });
                    }
                    const dire = `${__dirname}/../../main/classrooms/${data.Kid}/`;
                    
                    if (!fs.existsSync(dire)){
                        fs.mkdirSync(dire,{ recursive: true });
                    }
                    generateClassUrlAlias(data).then((dataUrl: string) => {
                        data.shortUrl = dataUrl;
                        data.save((err,nd) => {
                            if(err){ 
                                console.log(err);
                                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to save class shortURL");
                            }
                            // console.log(nd);
                            // console.log(dataUrl);
                            const jsContent = fs.readFileSync(jsSource,"utf8");
                            const cssContent = fs.readFileSync(cssSource,"utf8");
                            const htmlContent = fs.readFileSync(htmlSource,"utf8");

                            new classWeb({ classroomKid:data.Kid,classroomId: data._id, js: {id:jsfile,content:jsContent}, css: { id:cssfile,content:cssContent }, html: {id:htmlfile,content:htmlContent} }).save().then((file) => {
                                return  successResponseWithData(res, "success", nd);

                            }).catch(err => {
                                console.log(err);
                                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to create classroom web files.");
                            });
                        });

                    }).catch((err: string) => {
                        console.log(err);
                        return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to generate shortURL");
                    });

                }).catch((err: Error) => {
                    console.log(err);
                    return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to save classroom data to model");
                });

            }
        }).catch(() => {
            return apiResponse.ErrorResponse(res,"User not found");
        });

       
    } catch (error) {
        console.log(error);
        return apiResponse.ErrorResponse(res,"Somthing went wrong");
        
    }

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

export const getClassroomFromLocation = (req: Request, res: Response): void => {
    const location = req.params.location;
    Classroom.find({ location }).exec().then((data: object) => res.json({ data })).catch((err: Error) => res.status(404).json(err));
};

export const findClassRoom = (req: Request, res: Response): any => {
    const { q } = req.params;
    if (q && q.trim() !== "") {
        const reqexQ = new RegExp(q, "i");
        Classroom.find({ name: reqexQ }, "name location", (err, d: ClassroomDocument[]| any) => {
            if (d && err === null && d.status !== 3) {
                
                return apiResponse.successResponseWithData(res, "Success", d);
            } else {
                return apiResponse.ErrorResponse(res, "Opps!");
            }
        });
    }
};

export const downloadClassfiles = (req: Request, res: Response): void => {
    const { classroomid } = req.params;

    const dire = `${__dirname}/../../main/classrooms/${classroomid}/${classroomid+ "-codemarka"+".zip"}`;
    const root = `${__dirname}/../../main/classrooms/${classroomid}/`;

    try {
        if (fs.existsSync(dire) === true) {
            //file exists
            console.log("File exists");
            fs.unlinkSync(dire);
        }
    } catch(err) {
        console.error(err);
        return;
    }

    classWeb.findOne({classroomId: classroomid},(err, res) => {
        if(err) return;
        if(res){
            // create files from database;
            try {
                
                fs.appendFileSync(`${root}/${res.html.id}.html`,res.html.content);
                fs.appendFileSync(`${root}/${res.css.id}.css`,res.css.content);
                fs.appendFileSync(`${root}/${res.js.id}.js`,res.js.content);
            } catch (err) {
                return false;
            }
        }
    });
    // create a file to stream archive data to.
    var output = fs.createWriteStream(dire);
    var archive = archiver("zip", {
        zlib: { level: 9 } // Sets the compression level.
    });
 
    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", function() {
        return res.download(dire, (e) => {
            if(e) return false;
        });
    });
 
    output.on("end", function() {
        console.log("Data has been drained");
    });
 
    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", function(err) {
        if (err.code === "ENOENT") {
            // log warning
        } else {
            // throw error
            throw err;
        }
    });
 
    // good practice to catch this error explicitly
    archive.on("error", function() {
        return false;
    });
 
    // pipe archive data to the file
    archive.pipe(output);
 
 
    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(root, "dist");
 

    archive.finalize().then(() => {
        console.log("Finalized");
    });


 
};

export const classroomPreview = (req: Request, res: Response): object => {
    const { classroomKid } = req.params;
    // todo -- track who previews files

    if (classroomKid && classroomKid.trim().length < 24) {
        return apiResponse.ErrorResponse(res, "Invalid classroom id");
    }

    try {

        classWeb.findOne({ classroomKid }).then((d: any) => {

            if (!d && d === null) {
                return apiResponse.ErrorResponse(res, { "message": "files not found" });
            } else {
                        
                const cssfileId = d.css.id;
                const jsFileId = d.js.id;
                const htmlFileId = d.html.id;
                const cssContent = d.css.content;
                const htmlContent = d.html.content;
                const jsContent = d.js.content;
                                        
                const html = {
                    id: htmlFileId,
                    content: htmlContent
                };
                const css = {
                    id: cssfileId,
                    content: cssContent
                };
                const js = {
                    id: jsFileId,
                    content: jsContent
                };
                Classroom.findOne({Kid: classroomKid},(err,respo: ClassroomDocument) => {
                    if(!err && respo){
                        const name = respo.name;
                        return apiResponse.successResponseWithData(res, "success", { css, html, js, classKid:classroomKid,name });
                    }
                });
            }
        });

    } catch (e) {
        return apiResponse.ErrorResponse(res, { "message": "files not found" });
    }
};

export const verifyClassroom = (req: Request, res: Response, next: NextFunction): any => {

    const { classroom } = req.body;
    if (classroom && classroom.trim().length < 24) {
        return apiResponse.ErrorResponse(res, "Invalid classroom id");
    }

    Classroom.findOneAndUpdate({ Kid: classroom }, { $inc: { visits: 1 } }).then(d => {
        if (d && d.status === started) {
            return apiResponse.successResponseWithData(res, "success", d);
        } else if (d && d.status === notStarted) {
            return apiResponse.successResponse(res,
                {startTimeFull:`${d.startTime} - ${d.startDate}`, msg:"Class has not started!",cdata:d });
        } else {
            return apiResponse.successResponse(res, "Class has ended!");
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
        .catch((err: Error) => {
            res.status(500).json({
                message: err
            });
        });
};

export const getTrending = (req: Request, res: Response): object => {


    return Classroom.find({ status: started, classVisibility: "Public" }).limit(12).sort({ visits: -1 }).then(d => {
        
        return apiResponse.successResponseWithData(res, "Success", d);

    }).catch(e => {
        return apiResponse.ErrorResponse(res, e);
    });
};



// fecth classroom original url
export const fecthClassByUrlAlias = (req: Request, res: Response, next: NextFunction): any => {
    const { id } = req.params;
    const url = `https://cmarka.xyz/${id}`;
    console.log(url);
    if(req.hostname.includes("localhost") || req.hostname.includes("cmarka.xyz")){
        classAliasUrl.findOneAndUpdate({shortUrl: url},{$inc:{visits:1}}).then(data => {
            if(data){
                if(req.hostname.includes("localhost")){
                    return apiResponse.successResponseWithData(res, "Success", `http://localhost:3000/c/classroom/${data.classroomKid}`);
                } 
                return apiResponse.successResponseWithData(res, "Success", `https://codemarka.dev/c/classroom/${data.classroomKid}`);

            }
            return apiResponse.ErrorResponse(res,"URL not found");
        }).catch(err => {
            return apiResponse.ErrorResponse(res, err);
        });
    } else {
        return apiResponse.ErrorResponse(res,"CRSF Toekn Invalid!");
    }
};

// verify if a classroom belongs to a user
export const verifyUserClassroom = (req: Request, res: Response, next: NextFunction): any => {
    const { classid, userid } = req.params;

    if (classid && classid.trim() !== ""
        && userid && userid.trim() !== ""
        && classid.length > 23
        && userid.length > 23) {
        Classroom.findById(classid, (err, doc: ClassroomDocument) => {
            if (err) {
                return next(err);
            }
            if (doc && doc !== null) {
                if (doc.owner === userid) {
                    return apiResponse.successResponse(res, "sucess verifying");
                } else {
                    return apiResponse.unauthorizedResponse(res, "failed verification");
                }
            } else {
                return apiResponse.ErrorResponse(res, doc);
            }
        });
    } else {
        return apiResponse.ErrorResponse(res, "Missing or invalid request parameters");
    }

};

// fetch all classroom by user
export const getUserClassrooms = (req: Request, res: Response, next: NextFunction): any => {
    const { userid } = req.params;

    Classroom.find(({ owner: userid }), "classType numberInClass status visits likes topic description location", (err: Error, doc: ClassroomDocument) => {
        if (err) {
            return next(err);
        }
        if (doc && doc !== null) {
            return apiResponse.successResponseWithData(res, "success", doc);
        } else {
            return apiResponse.ErrorResponse(res, null);
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
