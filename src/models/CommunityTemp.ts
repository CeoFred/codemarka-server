import mongoose from "mongoose";

export type CommunityTempDocument = mongoose.Document & {
    email: string;
    emailVerified: boolean;
    password: string;
    tokens: any[];
    communityName: string;
    communityAcronym: string;
    telephone: string;
    completed: boolean;
    affiliation: string;
    meetupLink: string;
    instagramLink: string;
    facebookUrl: string;
    twitterUrl: string;
    city: string;
    country: string;
    physicalAddress: string;
    publicWebsite: string;
    logoUrl: string;
    Logo: string;
    acronym: string;
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
    organizers: { lead: { email: string; fullname: string }; coLead: {email: string; fullname: string } };
    updateAfterLogin: (ip: string | string[],token: any) => void;
    hashPasswordResetAndValidateToken: (password: string, token: string) => boolean;
};

const communityTempScehema = new mongoose.Schema({
    email: { type: String, unique: false },
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
        type: String
    },
    facebookUrl: {
        type: String
    },
    isConfirmed: {
        default: false,
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
        required: false
    },
    Logo: {
        type: String
    },
    communityAcronym: {   
        type: String,
        required: false
    },
    publicWebsite: {      
        type: String
    },
    affiliation:{
        required: false,
        type: String
    },
    city: {
        required: false,
        type: String
    },
    country: {     
        required: false,
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

export const CommunityTemp = mongoose.model<CommunityTempDocument>("CommunityTemp", communityTempScehema);
