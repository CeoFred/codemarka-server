import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import geo from "geoip-lite";
export type UserDocument = mongoose.Document & {
    email: string;
    emailVerified: boolean;
    googleid: string;
    githubid: string;
    profile: {
        name: string;
        gender: string;
        location: string;
        website: string;
        picture: string;
    };
    password: string;
    tokens: any[];
    accountType: string;
    name: string;
    gender: string;
    location: string;
    website: string;
    picture: string;
    username: string;
    comparePassword: comparePasswordFunction;
    addToken: addToken;
    status: boolean;
    resetPasswordToken: string | "";
    resetPasswordExpires: Date | "";
    techStack: string;
    isConfirmed: boolean;
    privateClassCreated: number;
    publicClassCreated: number;
    confirmOTP: number;
    gravatar: (size: number) => string;
    emailVerificationToken: string;
    geoDetails: object;
    emailConfirmed: () => void;
    gravatarUrl: string;
    kid: any;
    updateAfterLogin: (ip: string | string[],token: any) => void;
    hashPasswordResetAndValidateToken: (password: string, token: string) => boolean;
};

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: boolean) => {}) => void;
type addToken = (token: string,type: string) => void;
export interface AuthToken {
    accessToken: string;
    kind: string;
}

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    kid:String,
    resetPasswordToken: {
        type:String,
        default:""
    },
    resetPasswordExpires: {
        type:Date,
        default:""
    },
    tokens: Array,
    publicClassCreated: {
        type: Number,
        default: 0
    },
    privateClassCreated: {
        type: Number,
        default:0
    },
    username: {
        unique:true,
        type: String
    },
    status: {
        default: true,
        type: Boolean
    },
    isConfirmed: {
        default: true,
        type: Boolean
    },
    firstName: String,
    gender: String,
    location: String,
    website: String,
    picture: String,
    accountType: {
        default: "regular",
        type: String
    },
    confirmOTP: {
        type: Number
    },
    techStack : String,
    emailVerificationToken : {
        type: String
    },
    gravatarUrl: String,
    lastloggedInIp: String,
    geoDetails: Object,
    emailVerified: Boolean,

    googleid: {
        type: String,
        default: undefined
    },
    githubid: {
        type: String,
        default: undefined
    },
    lastLoggedInIp: String,
    profile: {
        name: String,
        gender: String,
        location: String,
        website: String,
        picture: String
    }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre("save", function save(next: any) {
    const user = this as UserDocument;
    // if (user.isModified("password")) { return next(); }
    // user.password = bcrypt.hashSync(user.password, 10);
    // console.log("pass modified",user.password);
    // next();
    
    // check if password is present and is modified.
    if ( user.password && user.isModified("password") ) {

        // call your hashPassword method here which will return the hashed password.
        user.password = bcrypt.hashSync(user.password, 10);

    }

    // everything is done, so let's call the next callback.
    next();

});

/**
 * Password reset hash middleware
 */

// const hashPasswordResetAndValidateToken = function (password: string, Resettoken: string): boolean {
//     this.password = bcrypt.hashSync(password,10);
//     let tokens = this.tokens;

//     let foundToken =  tokens.filter((token: {type: string;accessToken: string}) => {
//         return String(token.type) === "ActRecry" && token.accessToken === Resettoken;
//     });

//     if (Array.isArray(foundToken) && foundToken.length > 0){
//         foundToken = true;
//         tokens =  tokens.filter((token: {type: string; accessToken: string}) => {
//             return String(token.type) !== "ActRecry" && token.accessToken !== Resettoken;
//         }); 
//     } else {
//         foundToken = false;
//     }

//     this.tokens = tokens;
//     console.log(this.password);
//     console.log(password);

//     this.save();
//     return foundToken;
// };

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};


const updateAfterLogin = function(ip: any,token: object): void {
    this.lastLoggedInIp = ip;
    const geoCord = geo.lookup(ip);
    console.log(ip);
    this.geoDetails = geoCord;
    let tokens = this.tokens;
    tokens.push(token);
    this.save();
    

};
const emailConfirmed = function(): void {
    this.isConfirmed = true;
    this.save();
};

userSchema.methods.comparePassword = comparePassword;
userSchema.methods.emailConfirmed = emailConfirmed;
userSchema.methods.updateAfterLogin = updateAfterLogin;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema);
