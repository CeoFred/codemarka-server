import fs from "fs";
import archiver from "archiver";

import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

import { Classroom, ClassroomDocument } from "../models/classroom";
import { randomNumber } from "../helpers/utility";
import { successResponseWithData } from "../helpers/apiResponse";
import { classWeb } from "../models/classWebFiles";
import * as apiResponse from "../helpers/apiResponse";

// const created = 1;
const creating = 2;

export const createClassRoom = (req: Request, res: Response, next: NextFunction): object => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(403).json({ errors: errors.array() });
    }

    const { name, topic, startTime, startDate, description, classType, visibility } = req.body;
    // get user id and compare with json decoded token sent
    const userid: string = req.body.decoded._id;

    const newclassroom = new Classroom({
        name,
        topic,
        description,
        classVisibility: visibility,
        classType,
        startTime,
        startDate,
        status: creating,
        owner: userid
    });
    newclassroom.save().then((data: ClassroomDocument) => {
        const jsfile = randomNumber(15);
        const htmlfile = randomNumber(15);
        const cssfile = randomNumber(15);

        // create editors for class
        const dire = `${__dirname}/../../main/classrooms/${data._id}/`;
        const jsSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.js`;
        const cssSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.css`;
        const htmlSource = `${__dirname}/../../main/boilerplates/basic--web--app/index.html`;

        if (!fs.existsSync(dire)) {

            fs.mkdir(dire, { recursive: true }, (err) => {


                if (!err) {

                    fs.copyFile(jsSource, `${dire}/${jsfile}.js`, (err) => {
                        if (err) next(err);
                    });
                    fs.copyFile(htmlSource, `${dire}/${htmlfile}.html`, (err) => {
                        if (err) next(err);
                    });
                    fs.copyFile(cssSource, `${dire}/${cssfile}.css`, (err) => {
                        if (err) next(err);
                    });
                } else {

                    return next(err);
                }
            });
            new classWeb({ classroomId: data._id, js: jsfile, css: cssfile, html: htmlfile }).save().then(() => {

                successResponseWithData(res, "success", data);

            }).catch(err => {
                return next(err);
            });
        }

    }).catch((err: Error) => next(err.message));

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
        Classroom.find({ name: reqexQ }, "name location", (err, d: ClassroomDocument) => {
            if (d && err === null && d.status !== 3) {
                return apiResponse.successResponseWithData(res, "Successs", d);
            } else {
                return apiResponse.ErrorResponse(res, "Opps!");
            }
        });
    }
};

export const downloadClassfiles = (req: Request, res: Response): void => {
    const { classroomid } = req.params;

    const dire = `${__dirname}/../../main/classrooms/${classroomid}/`;

    if(fs.existsSync(dire+classroomid+".zip")) {
        fs.unlink(dire+classroomid+".zip",(err) => {
            if(err) throw err;
            // create a file to stream archive data to.
            var output = fs.createWriteStream(dire + classroomid +".zip");
            var archive = archiver("zip", {
                zlib: { level: 9 } // Sets the compression level.
            });
 
            // listen for all archive data to be written
            // 'close' event is fired only when a file descriptor is involved
            output.on("close", function() {
                console.log(archive.pointer() + " total bytes");
                console.log("archiver has been finalized and the output file descriptor has closed.");
                return res.download(`${dire}${classroomid}.zip`, (e) => {
                    if(e) return false;
                    console.log("Finished");

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
            archive.on("error", function(err) {
                throw err;
            });
 
            // pipe archive data to the file
            archive.pipe(output);
 
 
            // append files from a sub-directory, putting its contents at the root of archive
            archive.directory(dire, "dist");
 

            archive.finalize().then(() => {
                console.log("Finalized");
            });

        });
    } else {
        // create a file to stream archive data to.
        var output = fs.createWriteStream(dire + classroomid +".zip");
        var archive = archiver("zip", {
            zlib: { level: 9 } // Sets the compression level.
        });
 
        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on("close", function() {
            console.log(archive.pointer() + " total bytes");
            console.log("archiver has been finalized and the output file descriptor has closed.");
            return res.download(`${dire}${classroomid}.zip`, (e) => {
                if(e) return false;
                console.log("Finished");

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
        archive.on("error", function(err) {
            throw err;
        });
 
        // pipe archive data to the file
        archive.pipe(output);
 
 
        // append files from a sub-directory, putting its contents at the root of archive
        archive.directory(dire, "dist");
 

        archive.finalize().then(() => {
            console.log("Finalized");
        });

    }

 
};

export const classroomPreview = (req: Request, res: Response): object => {
    const { classroomid } = req.params;

    const dire = `${__dirname}/../../main/classrooms/${classroomid}/`;

    // todo -- track who previews files

    if (classroomid && classroomid.trim().length < 24) {
        return apiResponse.ErrorResponse(res, "Invalid classroom id");
    }

    try {

        classWeb.findOne({ classroomId: classroomid }).then((d: any) => {

            if (!d && d === null) {
                return apiResponse.ErrorResponse(res, { "message": "files not found" });
            } else {

                const cssfileId = d.css;
                const jsFileId = d.js;
                const htmlFileId = d.html;

                if (!cssfileId || !jsFileId || !htmlFileId) {
                    return apiResponse.ErrorResponse(res, { "message": "files not found" });

                }


                fs.readdir(dire, { withFileTypes: true }, (err, files) => {

                    if (err) {
                        console.log(err);
                        return apiResponse.ErrorResponse(res, { "message": "files not found" });

                    }
                    else {
                        let htmlFilePath: string, cssFilePath: string, jsFilePath: string;
                        let htmlFileContent: any, cssFileContent: any, jsFileContent: any;
                        // Loop through files inclassroom files
                        files.forEach(element => {

                            // read each file in classroom folder
                            if (element.name.includes("css")) {
                                cssFilePath = `${dire}/${element.name}`;
                                cssFileContent = fs.readFileSync(cssFilePath, "utf8");
                            }

                            if (element.name.includes("js")) {
                                jsFilePath = `${dire}/${element.name}`;
                                jsFileContent = fs.readFileSync(jsFilePath, "utf8");

                            }

                            if (element.name.includes("html")) {
                                htmlFilePath = `${dire}/${element.name}`;
                                htmlFileContent = fs.readFileSync(htmlFilePath, "utf8");

                            }
                        });
                        const ht = {
                            id: htmlFileId,
                            content: htmlFileContent
                        };
                        const cs = {
                            id: cssfileId,
                            content: cssFileContent
                        };
                        const js = {
                            id: jsFileId,
                            content: jsFileContent
                        };
                        return apiResponse.successResponseWithData(res, "success", { cs, ht, js, classroomid });

                    }

                });

            }
        });

    } catch (e) {

    }
};

export const verifyClassroom = (req: Request, res: Response, next: NextFunction): any => {

    const { classroom } = req.body;
    const dire = `${__dirname}/../../main/classrooms/${classroom}/`;
    if (classroom && classroom.trim().length < 24) {
        return apiResponse.ErrorResponse(res, "Invalid classroom id");
    }

    if (fs.existsSync(dire)) {
        Classroom.findOneAndUpdate({ _id: classroom }, { $inc: { visits: 1 } }).then(d => {
            if (d && d.status === 2) {
                return apiResponse.successResponseWithData(res, "success", d);
            } else if (d && d.status === 1) {
                return apiResponse.ErrorResponse(res, "Class has not started!");
            } else {
                return apiResponse.ErrorResponse(res, "Class has ended!");
            }
        }).catch(e => {
            return next(e);
        });
    } else {
        return apiResponse.ErrorResponse(res, "Class Files Not Found");

    }

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
    return Classroom.find({ status: 2, classVisibility: "Public" }).sort({ visits: -1 }).then(d => {
        return apiResponse.successResponseWithData(res, "Success", d);

    }).catch(e => {
        return apiResponse.ErrorResponse(res, e);
    });
};

const generateShortUrl = (): string => {
    return `https://tinycloab.herokuapp.com/${randomNumber(6)}`;
};
// shorten classroom links
export const shortenClassLinks = (req: Request, res: Response, next: NextFunction): any => {
    const { classid } = req.params;
    const shortly = generateShortUrl();
    if (classid && classid.trim() !== "" && classid.length > 23) {
        Classroom.findOneAndUpdate({ _id: classid }, { $set: { shortUrl: shortly } }, { new: true }, (err, doc) => {
            if (err) {
                return next(err);
            }
            if (doc && doc !== null) {
                return apiResponse.successResponseWithData(res, "success", shortly);
            } else {
                return apiResponse.ErrorResponse(res, null);
            }
        });
    } else {

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
