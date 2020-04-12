import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import geo from "geoip-lite";

export type CommunityDocument = mongoose.Document & {
    email: string;
    emailVerified: boolean;
    password: string;
    tokens: any[];
    name: string;
    physicalLocation: string;
    publicWebsite: string;
    Logo: string;
    acronym: string;
    comparePassword: comparePasswordFunction;
    addToken: addToken;
    status: boolean;
    resetPasswordToken: string | "";
    resetPasswordExpires: Date | "";
    isConfirmed: boolean;
    privateClassCreated: number;
    publicClassCreated: number;
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

const communityScehema = new mongoose.Schema({
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
    twitterUrl: {
        unique:true,
        type: String
    },
    facebookUrl: {
        default: true,
        type: Boolean
    },
    isConfirmed: {
        default: true,
        type: Boolean
    },
    logoUrl: String,
    physicalAddress : String,
    emailVerificationToken : {
        type: String
    },
    gravatarUrl: String,
    lastloggedInIp: String,
    geoDetails: Object,
    emailVerified: Boolean,

    meetupLink: {
        type: String,
        default: undefined
    },
    instagramLink: {
        type: String,
        default: undefined
    },
    lastLoggedInIp: String,
    communityName: {
        type: String,
        required: true,
        unique: true
    },
    communityAcronym: {   
        type: String,
        required: true,
        unique: true
    },
    publicWebsite: {      
        type: String,
        unique: true
    },
    affiliation:{
        required: true,
        type: String
    },
    city: {
        required: true,
        type: String
    },
    country: {     
        required: true,
        type: String
    },
    organizers:{
        lead:{    
            fullname: String,
            email: String
        },
        coLead:{
            fullname: String,
            email: String
        }
    }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
communityScehema.pre("save", function save(next: any) {
    const user = this as CommunityDocument;
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

communityScehema.methods.comparePassword = comparePassword;
communityScehema.methods.emailConfirmed = emailConfirmed;
communityScehema.methods.updateAfterLogin = updateAfterLogin;

/**
 * Helper method for getting user's gravatar.
 */
communityScehema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const Community = mongoose.model<CommunityDocument>("User", communityScehema);
