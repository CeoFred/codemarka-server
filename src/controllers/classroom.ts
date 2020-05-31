/* eslint-disable @typescript-eslint/explicit-function-return-type */
import fs from "fs";
import archiver from "archiver";

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

import { Classroom, ClassroomDocument } from "../models/classroom";
import { ClassroomAttendance } from "../models/Attendance";
import { classAliasUrl } from "../models/classAlias"; 
import { User, UserDocument } from "../models/User";
import { randomNumber ,randomString} from "../helpers/utility";
import { successResponseWithData } from "../helpers/apiResponse";
import { classWeb } from "../models/classWebFiles";
import * as apiResponse from "../helpers/apiResponse";
import { Community, CommunityDocument } from "../models/Community";
import { CLASSROOM } from "../config/url";
const notStarted = 1;
const started = 2;
const ended = 3;

const MAX_PRIVATE_CLASSROOM_REGULAR = 15;
const MAX_PRIVATE_CLASSROOM_PREMUIM = "unlimited";

const MAX_CASSROOM_MEMBERS_REGULAR = 100;
const MAX_CLASSROOM_MEMBERS_PREMUIM = 300;

const MAX_PUBLIC_CLASSROOMS = "unlimited";
export const getAllLanguageSettings = (req: Request, res: Response): void => {
    const classroomKid = req.params.classroomkid;
    classWeb.findOne({classroomKid},(err, docc) => {
        if(!err && docc){
            return  successResponseWithData(res, "success", {css:docc.css.settings,js:docc.js.settings});

        } else {
            return apiResponse.ErrorResponse(res,"Not found");
        }
    });

};

export const getLanguageSettings = (req: Request, res: Response): void => {
    const classroomKid = req.params.classroomkid;
    const language = req.params.language;
    
    classWeb.findOne({classroomKid},(err, docc) => {
        if(!err && docc){
            if(language && language === "css"){
                return  successResponseWithData(res, "success", docc.css.settings);

            } else if(language && language === "js"){
                return  successResponseWithData(res, "success", docc.js.settings);

            } else if(language && language === "html"){
                return  successResponseWithData(res, "success", docc.html.settings);

            } else {
                return res.status(403).json({ errors: "no language specified" });
            }
        } else {
            return apiResponse.ErrorResponse(res,"Not found");
        }
    });
};
export const createClassRoom = (req: Request, res: Response, next: NextFunction): object => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(403).json({ errors: errors.array() });
    }

    const { user: userData, isTakingAttendance, location, name, topic, startTime, startDate, description, classType, visibility } = req.body;
    
    const { accountType: creatorsAccountType } = userData;

    const accountid: string = req.body.decoded.kid;
    // find user and validate classroom creation limit.
    let userAccountType: number,privateClassroomsCreated,user;

    try {
       
        function createClassroominit(user: UserDocument | CommunityDocument){
            if (user) {
                userAccountType = user.accountType;
                privateClassroomsCreated = user.privateClassCreated;
            } else {
                return apiResponse.ErrorResponse(res,"User not found");
            }
                
            if (userAccountType === 101) {

                if (visibility === "Private") {
                    if (Number(privateClassroomsCreated) > MAX_PRIVATE_CLASSROOM_REGULAR) {
                        return apiResponse.ErrorResponse(res,"You have reached your max private classroom limit for your account");
                    }
                }
            }
                
            const generateClassUrlAlias = (data: any): any => {
                return new Promise((resolve,reject) => {
                    let rs = randomString(4);

                    classAliasUrl.findOne({shortUrl:`http://cmarka.xyz/${rs}`},(err, url) => {
                        if(err) reject("Something went wrong while searching for urlAlias");
                        if(url){
                            //url exists
                            resolve(generateClassUrlAlias(data));
                        } else {
                            const url = new classAliasUrl({Kid: randomNumber(29),shortUrl: `http://cmarka.xyz/${rs}`,classroomKid:data.kid});
                            url.save((err,urlDoc) => {
                                (err);
                                if(err) reject("Something went wrong while trying to save");
                                resolve(`http://cmarka.xyz/${rs}`);
                            });
                        }
                    });
                });
            };
            const kid = randomString(40);

            const newclassroom = new Classroom({
                name,
                kid,
                topic,
                description,
                classVisibility: visibility,
                classType,
                startTime: creatorsAccountType === 101 ? new Date().getHours() : startTime,
                startDate: creatorsAccountType === 101 ? new Date().getFullYear() : startDate,
                status: notStarted,
                owner: accountid,
                location: creatorsAccountType === 101 ? "NOT_SET" : location,
                isTakingAttendance: isTakingAttendance.toLowerCase() === "yes" ? true : false ,
                maxUsers: userAccountType === 101 ? MAX_CASSROOM_MEMBERS_REGULAR : MAX_CLASSROOM_MEMBERS_PREMUIM
            });

            newclassroom.gravatar(23);
            newclassroom.save().then((data: ClassroomDocument) => {

                new ClassroomAttendance({
                    kid: randomString(40),
                    classroomkid: data.kid
                }).save((err,attendance) => {
                    if(err && attendance){
                        return apiResponse.ErrorResponse(res,"Failed!");
                    }
                });

                const jsfile = randomNumber(15);
                const htmlfile = randomNumber(15);
                const cssfile = randomNumber(15);

                // create editors for class
                const jsSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.js`;
                const cssSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.css`;
                const htmlSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.html`;
                /// update user classrooms limit
                if (visibility === "Public") {
                    User.findOneAndUpdate({kid: accountid},{$inc: {publicClassCreated: 1}},(err,doc: UserDocument) => {
                        if(err){ 
                            return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user public class created.");
                        }
                        if(!doc){
                            Community.findOneAndUpdate({kid: accountid},{$inc: {publicClassCreated: 1}},(err, doc: CommunityDocument) => {
                                if(err){ 
                                    return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user private class created");
                                }
                            });
                        }
                    });
                } else {
                    User.findOneAndUpdate({kid: accountid},{$inc: {privateClassCreated: 1}},(err,doc: UserDocument) => {
                        if(err){ 
                            return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user private class created");
                        }
                            
                        if(!doc){
                            Community.findOneAndUpdate({kid: accountid},{$inc: {privateClassCreated: 1}},(err, doc: CommunityDocument) => {
                                if(err){ 
                                    return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to update user private class created");
                                }
                            });
                        }
                    });
                }
                const dire = `${__dirname}/../../main/classrooms/${data.kid}/`;
                    
                if (!fs.existsSync(dire)){
                    fs.mkdirSync(dire,{ recursive: true });
                }
                generateClassUrlAlias(data).then((dataUrl: string) => {
                    data.shortUrl = dataUrl;
                    data.save((err,nd) => {
                        if(err){ 
                            (err);
                            return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to save class shortURL");
                        }
                        // (nd);
                        // (dataUrl);
                        const jsContent = fs.readFileSync(jsSource,"utf8");
                        const cssContent = fs.readFileSync(cssSource,"utf8");
                        const htmlContent = fs.readFileSync(htmlSource,"utf8");

                        new classWeb({ classroomKid:data.kid,classroomId: data._id, js: {id:jsfile,content:jsContent}, css: { id:cssfile,content:cssContent }, html: {id:htmlfile,content:htmlContent} }).save().then((file) => {
                            return  successResponseWithData(res, "success", nd);

                        }).catch(err => {
                            (err);
                            return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to create classroom web files.");
                        });
                    });

                }).catch((err: string) => {
                    (err);
                    return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to generate shortURL");
                });

            }).catch((err: Error) => {
                console.log(err);
                return apiResponse.ErrorResponse(res,"Whoops! Something went wrong while trying to save classroom data to model");
            });
        }
        User.findOne({kid:accountid}).then((respo: any) => {

            if(respo){
                return createClassroominit(respo);
            } else {
                Community.findOne({kid:accountid}).then((community: CommunityDocument) => {
                    if(community) {
                        return createClassroominit(community);
                    } else {
                        return apiResponse.ErrorResponse(res,"Account not found");
                    }
                });
            }
        }).catch((err) => {
            return apiResponse.ErrorResponse(res,"Something went wrong");
        });

       
    } catch (error) {
        (error);
        return apiResponse.ErrorResponse(res,"Somthing went wrong");
        
    }

};

export const getClassroomFromLocation = (req: Request, res: Response): void => {
    const location = req.params.location;
    Classroom.find({ location }).exec().then((data: object) => res.json({ data })).catch((err: Error) => res.status(404).json(err));
};

export const downloadAttendance = (req: Request, res: Response): void => {
    const classroomkid = req.params.classroom;
    const csvName = req.params.attednancecsv;
    const filePath = __dirname + "/../../main/classrooms/" + classroomkid + "/" + csvName +".csv";
    console.log(filePath);
    ClassroomAttendance.findOne({classroomkid, csvName},(err,cr) => {
        if(!err && cr){

            if(fs.existsSync(filePath)){
                cr.csvName = "";
                cr.save((err, savedAtt) => {
                    if(!err && savedAtt){
                        return res.download(filePath,(err) => {
                            if(err){
                                console.log(err);
                            }
                        });
                    }
                });
            } else {
                return res.redirect(CLASSROOM + "/" + classroomkid + "/?attendanceStat=Failed&r=not_found");
            }
        } else if(cr === null) {
            return res.redirect(CLASSROOM + "/" + classroomkid + "/?attendanceStat=Failed");
        }
    });
};

export const getLiveClassroomSessions =  (req: Request, res: Response): void => {
    Classroom.find({status: 3},"name kid topic description startTime owner").then((d) => {
        if(d){ 
            const finalStructure: any[] = [];
            d.forEach(element => {
                const classroomOwner = element.owner;
                Community.findOne({kid: classroomOwner},(err,comm) => {
                    if(err){
                        return apiResponse.ErrorResponse(res,"Something went wrong");
                    } else if(comm) {
                        finalStructure.push({ ...d, by: comm.communityName.toLowerCase() });
                    } else {
                        User.findOne({kid: element.owner},(err, user) => {
                            if(err){
                                return apiResponse.ErrorResponse(res, "Something went wrong");
                            } else if( user ){
                                finalStructure.push({...d,by: user.name.toLowerCase() });
                            } else {
                                return apiResponse.ErrorResponse(res,"Failed to fetch classroom owners");
                            }
                        });
                    }
                });
            });
            return apiResponse.successResponseWithData(res,"success",finalStructure);
        } else {
            return apiResponse.notFoundResponse(res,"No results found");
        }
    }).catch((e) => {
        (e);
        return apiResponse.notFoundResponse(res, "No results found");
    });
};

export const getUpcomingClassroomSessions = (req: Request, res: Response): void => {

    Classroom.find({ status: 1 }, "name kid topic description startTime owner startDate").then((d) => {
        if (d) {
            (async () => {
                let resol = await Promise.all(
                    d.map(async classes => {
                        const t =  new Promise((resolve,reject)  => resolve(Community.findOne({ kid: classes.owner})));
                        // const t2 = new Promise((resolve, reject) => resolve(User.findOne({ kid: classes.owner })));
                        const ew = t.then(ty => ty);
                        return await(ew);
                    }));  
                let resolv = resol.filter(rt => rt !== null);

                const communityOrUsers = resolv.map((comU: any,index) => {
                    return { n: comU.communityName, kid: comU.kid };
                });

                const po = d.map((cl,ein) => {
                    let ow = cl.owner;
                    let fo;
                    
                    communityOrUsers.map(ss => {
                        if(ss && ss.kid === ow){
                            fo = {by: ss.n,kid: d[ein].kid,topic: d[ein].topic, name: d[ein].name, date: d[ein].startDate ,time: d[ein].startTime };
                        }
                    });
                    return fo;
                });

                return apiResponse.successResponseWithData(res, "success", po.filter(r => r));

            })();
        } else {
            return apiResponse.notFoundResponse(res, "No results found");
        }

    }).catch((e) => {
        (e);
        return apiResponse.notFoundResponse(res, "No results found");
    });
};

export const findClassRoom = (req: Request, res: Response): any => {
    const { q } = req.params;
    if (q && q.trim() !== "") {
        const reqexQ = new RegExp(q, "i");
        Classroom.find({ $or: [ { "name": reqexQ},{ "topic" :reqexQ }] }, "name location topic kid", (err, d: ClassroomDocument[]| any) => {
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

    const dire = `${__dirname}/../../main/classrooms/${classroomid}/${classroomid+".zip"}`;
    const root = `${__dirname}/../../main/classrooms/${classroomid}/`;
    if (!fs.existsSync(root)){
        fs.mkdirSync(root,{ recursive: true });
    }
    try {
        if (fs.existsSync(dire) === true) {
            //file exists
            ("File exists");
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
                (err);
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
        ("Data has been drained");
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
    archive.directory(root, false);
 

    archive.finalize().then(() => {
        ("Finalized");
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
                    content: cssContent,
                    externalCDN: d.css.settings.externalCDN
                };
                const js = {
                    id: jsFileId,
                    content: jsContent,
                    externalCDN: d.js.settings.externalCDN
                };
                Classroom.findOne({kid: classroomKid},(err,respo: ClassroomDocument) => {
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

    Classroom.findOneAndUpdate({ kid: classroom }, { $inc: { visits: 1 } }).then(d => {
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
    Classroom.findOneAndUpdate({ kid: id },{status: ended}).exec()
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


    return Classroom.find({ status: started, classVisibility: "Public" }).limit(12).sort({ visits: -1 }).then((d: ClassroomDocument[]) => {
        let filteredClassrooms: any[] = [];
        if(d){
            filteredClassrooms = d.map((room: ClassroomDocument) => {
                return {
                    visits: room.visits,
                    likes: room.likes,
                    students: room.students,
                    location: room.location,
                    name: room.name,
                    description: room.description,
                    top: room.topic,
                    kid: room.kid,
                    topic: room.topic
                };
            });
        };
        return apiResponse.successResponseWithData(res, "Success", filteredClassrooms);

    }).catch(e => {
        return apiResponse.ErrorResponse(res, e);
    });
};



// fecth classroom original url
export const fecthClassByUrlAlias = (req: Request, res: Response, next: NextFunction): any => {
    const { id } = req.params;
    const url = `http://cmarka.xyz/${id}`;
    (url);
    (req.hostname);
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
};

// verify if a classroom belongs to a user
export const verifyUserClassroom = (req: Request, res: Response, next: NextFunction): any => {
    const { classid, accountid } = req.params;

    if (classid && classid.trim() !== ""
        && accountid && accountid.trim() !== ""
        && classid.length > 23
        && accountid.length > 23) {
        Classroom.findById(classid, (err, doc: ClassroomDocument) => {
            if (err) {
                return next(err);
            }
            if (doc && doc !== null) {
                if (doc.owner === accountid) {
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
    const { accountid } = req.params;

    Classroom.find(({ owner: accountid }), "classType numberInClass startTime startDate status visits likes topic description location", (err: Error, doc: ClassroomDocument) => {
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

    Classroom.update({ kid: id }, { $set: updateOps })
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
