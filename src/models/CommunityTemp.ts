import mongoose from "mongoose";

export type CommunityDocumentTemp = mongoose.Document & {
    email: string;
    password: string;
    communityName: string;
    communityAcronym: string;
    telephone: string;
    completed: boolean;
    physicalAddress: string;
    publicWebsite: string;
    meetupLink: string;
    instagramLink: string;
    facebookUrl: string;
    twitterUrl: string;
    Logo: string;
    affiliation: string;
    city: string;
    country: string;
    acronym: string;
    status: boolean;
    gravatar: (size: number) => string;
    gravatarUrl: string;
    kid: any;
    organizers: { lead: { fullname: string; email: string };coLead: { fullname: string; email: string } };
};

const communityTempScehema = new mongoose.Schema({
    email: { type: String, unique: false },
    password: String,
    kid:String,
    twitterUrl: {
        unique:false,
        type: String,
        required: false
    },
    completed: {
        default: false
    },
    facebookUrl: {
        required: false,
        type: String
    },
    Logo: String,
    isConfirmed: {
        default: true,
        type: Boolean,
        required: false
    },
    logoUrl: String,
    physicalAddress : String,
    telephone: String,
    gravatarUrl: String,
    meetupLink: {
        type: String,
        required: false
    },
    instagramLink: {
        type: String,
        required: false
    },
    communityName: {
        type: String,
        required: false,
        unique: false
    },
    communityAcronym: {   
        type: String,
        required: false,
        unique: false
    },
    publicWebsite: {      
        type: String,
        unique: false
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


export const CommunityTemp = mongoose.model<CommunityDocumentTemp>("CommunnityTemp", communityTempScehema);
