import { Response } from "express";
import { User, UserDocument } from "../models/User";

export const findUser = function (id: string): unknown {
  
    let result = null;

    if(id && id.trim() === ""){
        console.log("UE");
        result = false;
    }
    
    const r = User.findById(id).then((user: UserDocument) => {

        if(user && user !== null){
            console.log("FU");
            result = user;
            return result;
        } else {
            console.log("NU");

            result = false;
        }
        
    }).catch((err) => {
        result = false;
    });
    console.log(r);
    return r;

  
};
export const successResponse = function (res: Response, msg: string | object | number): object {
    var data = {
        status: 1,
        message: msg
    };
    return res.status(200).json(data);
};

export const successResponseWithData = function (res: Response, msg: string | object, data: string | object | number): object {
    var resData = {
        status: 1,
        message: msg,
        data: data
    };
    return res.status(200).json(resData);
};

export const ErrorResponse = function (res: Response, msg: string | object): object {
    var data = {
        status: 0,
        message: msg,
    };
    return res.status(500).json(data);
};

export const notFoundResponse = function (res: Response, msg: string | object): object {
    var data = {
        status: 0,
        message: msg,
    };
    return res.status(404).json(data);
};

export const validationErrorWithData = function (res: Response, msg: string | object, data: string | object): object {
    var resData = {
        status: 0,
        message: msg,
        data: data
    };
    return res.status(400).json(resData);
};

export const unauthorizedResponse = function (res: Response, msg: string | object): object {
    var data = {
        status: 0,
        message: msg,
    };
    return res.status(401).json(data);
};