import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import geo from "geoip-lite";
export type UserDocument = mongoose.Document & {
    email: string;
    emailVerified: boolean;
    snapchat: string;
    facebook: string;
    twitter: string;
    google: string;
    github: string;
    instagram: string;
    linkedin: string;
    steam: string;
    quickbooks: string;
    profile: {
        name: string;
        gender: string;
        location: string;
        website: string;
        picture: string;
    };
    password: string;
    passwordResetToken: string;
    passwordResetExpires: Date;
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
    techStack: string;
    isConfirmed: boolean;
    confirmOTP: number;
    gravatar: (size: number) => string;
    emailVerificationToken: string;
    updatedLastLoginIp: (ip: any,cd: any) => any;
    geoDetails: object;
    emailConfirmed: () => void;
    gravatarUrl: string;
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
    passwordResetToken: String,
    passwordResetExpires: Date,
    tokens: Array,
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

    snapchat: String,
    facebook: String,
    twitter: String,
    google: String,
    github: String,
    instagram: String,
    linkedin: String,
    steam: String,
    quickbooks: String,
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
    if (!user.isModified("password")) { return next(); }
    user.password = bcrypt.hashSync(user.password, 10);
    next();
});

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

const addToken = function(token: string, type: string): void{
    let tokens = this.tokens;
    tokens.push({accessToken:token,type});
    this.save();
};

const updatedLastLoginIp = function(ip: string,cb: any): void {
    this.lastLoggedInIp = ip;
    const geoCord = geo.lookup(ip);
    this.geoDetails = geoCord;
    this.save();
    cb(geoCord);

};
const emailConfirmed = function(): void {
    this.isConfirmed = true;
    this.save();
};

userSchema.methods.comparePassword = comparePassword;
userSchema.methods.addToken = addToken;
userSchema.methods.updatedLastLoginIp = updatedLastLoginIp;
userSchema.methods.emailConfirmed = emailConfirmed;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema);
