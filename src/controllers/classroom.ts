import {Classroom} from "../models/classroom";
import {  Request, Response,NextFunction } from "express";
import { body, validationResult } from "express-validator";
import fs from "fs";
import path from "path";

const created = 1;
const creating = 2;

export const createClassRoom = (req: Request, res: Response, next: NextFunction): any => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(403).json({ errors: errors.array() });
    }

    const { name, topic, startTime, startDate, description, clsasType, classVisibility } = req.body;
    
    // get user id and compare with json decoded token sent
    const userid: string = req.body.decoded.userid;

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
        // create editors for class
        const dire =  `${__dirname}/../../main/classrooms/${data._id}/`;
        fs.mkdir(dire,(err) => {
            if(!err){
                console.log(`Directory created as ${data._id}`);
                fs.writeFile(`${dire}/index.js`,"// javascrit code here",(err) => {
                    if(err) next(err);
                });
                fs.writeFile(`${dire}/index.html`,"// HTML code here",(err) => {
                    if(err) next(err);
                });
                fs.writeFile(`${dire}/style.css`,"// Styleshteet here",(err) => {
                    if(err) next(err);
                });  
            }else{
                return next(err);
            }
        });
        res.status(201).json({ status: "created", data });

    }).catch((err: any) => next(err.message));

};

export const getDetails = (req: Request, res: Response) => {
    const id = req.params.id;
    Classroom.findById(id)
        .exec()
        .then((data: any) => {
            res.status(200).json(data);
        })
        .catch((err: any) => {
            res.status(500).json({
                error: err
            });
        });

};

export const getClassroomFromLocation = (req: Request, res: Response) => {
    const location = req.params.location;
    // res.json({location})
    Classroom.find({ location }).exec().then((data: object) => res.json({ data })).catch((err: any) => res.status(404).json(err));
};


export const verifyClassroom = (req: Request, res: Response) => {
    console.log(req);
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

exports.updateClassInformation = (req: Request, res: Response) => {

    const id = req.params.classroomID;
    const updateOps: any = {};
    for (const ops of req.body) {
        updateOps[ops.propName] = ops.value;
    }

    Classroom.update({ _id: id }, { $set: updateOps })
        .exec()
        .then((data: object) => {
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
