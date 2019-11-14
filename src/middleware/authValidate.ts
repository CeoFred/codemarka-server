import {  check,sanitize,body,sanitizeBody } from "express-validator";
import { User} from "../models/User";
// import * as apiResponse from '../helpers/apiResponse';
const returnSignupValidation = () => {
    return [ 
        // eslint-disable-next-line @typescript-eslint/camelcase
        sanitize("email").normalizeEmail({ gmail_remove_dots: false }),
        body("username").isLength({ min: 1 }).trim().withMessage("A username must be specified.")
            .isAlphanumeric().withMessage("User name has non-alphanumeric characters."),
	
        body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
            .isEmail().withMessage("Email must be a valid email address.").custom((value) => {
                return User.findOne({email : value}).then((user) => {
                    if (user) {
                        return Promise.reject("E-mail already in use");
                    }
                });
            }),
        body("password").isLength({ min: 6 }).trim().withMessage("Password must be 6 characters or greater."),
        // Sanitize fields.
        sanitizeBody("username").escape(),

        body("username").custom(value => {
            return User.findOne({username: value}).then(user => {
                if (user) {
                    return Promise.reject("Username already taken");
                }
            });
        }),
        sanitizeBody("email").escape(),
        sanitizeBody("password").escape(),
    ];
};

const returnLoginValidation = () => {
    return [ 
        body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
            .isEmail().withMessage("Email must be a valid email address."),
        body("password").isLength({ min: 1 }).trim().withMessage("Password must be specified."),
        sanitizeBody("email").escape(),
        sanitizeBody("password").escape()
    ];
};

const returnpasswordUpdateValidation = () => {
    return [
        body("oldPassword").not().isEmpty().trim().escape(),
        body("newPassword").not().isEmpty().trim().escape(),
    ];
};
export const validate = function(method: string): any{
    switch (method) {
        case "signup": return returnSignupValidation();    
            
        case "login":return returnLoginValidation();
            
        case "passwordUpdate": return returnpasswordUpdateValidation();
            
        default: return returnSignupValidation();
                   
    }
};

