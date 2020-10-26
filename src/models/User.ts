import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import geo from "geoip-lite";
import jwt from "jsonwebtoken";
export type UserDocument = mongoose.Document & {
    email: string;
    emailVerified: boolean;
    googleid: string;
    githubid: string;
    name: string;
    profile: {
        name: string;
        gender: string;
        location: string;
        website: string;
        picture: string;
        firstname: string;
        lastname: string;
        phone: string;
        address: string;
        city: string;
        country: string;
        zip: string;
    };

    social: {
        facebook: string;
        twitter: string;
        linkedin: string;
    };
    password: string;
    tokens: any[];
    accountType: number;
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
    updateGeoDetails: (ip: string | string[]) => void;
    emailVerificationToken: string;
    geoDetails: any;
    emailConfirmed: () => void;
    gravatarUrl: string;
    kid: any;
    followers: any[];
    following: any[];
    githubrepo: string;
    updateAfterLogin: (ip: string | string[],token: any) => void;
    hashPasswordResetAndValidateToken: (password: string, token: string) => boolean;
    toAuthJSON: () => {id: string; email: string; token: string};
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
        type: String,
        default:""
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
        default: 101,
        type: Number
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
    geoDetails: {
        default:""
    },
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
        name: { default:"",type: String },
        gender: { default:"",type: String },
        location: { default:"",type: String },
        website: { default:"",type: String },
        picture: { default:"",type: String },
        firstname: { default:"",type: String },
        lastname: { default:"",type: String },
        phone: { default:"",type: String },
        address: { default:"",type: String },
        city: { default:"",type: String },
        country: { default:"",type: String },
        zip: { default:"",type: String },
        birthday: { default:"",type: String },
    },
    
    social: {
        facebook:  { default:"",type: String },
        twitter:  { default:"",type: String },
        linkedin:  { default:"",type: String },
        github:  { default:"",type: String }
    },
    followers: { type: Array, default: []},
    following:{ type: Array, default: []},
    githubrepo: String,
    title: {
        type: String,
        default:"Software Engineer",
    }
}, { timestamps: true });

// userSchema.post("findOne", function(result: UserDocument) {
//     result.password = undefined;
// });
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


const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

userSchema.methods.generateJWT = function() {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 60);

    return jwt.sign({
        email: this.email,
        id: this.kid,
        exp: parseInt(String(expirationDate.getTime() / 1000), 10),
    }, process.env.JWT_SECRET);
};

userSchema.methods.toAuthJSON = function() {
    return {
        kid: this.kid,
        email: this.email,
        token: this.generateJWT(),
        displayName: this.username,
        type:"regular"
    };
};

const updateGeoDetails = async function(ip: string): Promise<void> {
    this.lastLoggedInIp = ip;
    const geoCord = await geo.lookup(ip);
    this.geoDetails = geoCord;
};

const emailConfirmed = function(): void {
    this.isConfirmed = true;
    this.save();
};

userSchema.methods.comparePassword = comparePassword;
userSchema.methods.emailConfirmed = emailConfirmed;
userSchema.methods.updateGeoDetails = updateGeoDetails;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema);
