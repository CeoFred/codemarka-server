import mongoose from "mongoose";

export type classAliasDocument = mongoose.Document & {
    classroomKid: string;
    Kid: string;
    shortUrl: string;
};


const classAliasSchema = new mongoose.Schema({
    Kid: {
        type: String,
        required: true
    },
    classroomKid: {
        type: String,
        required: true
    },
    shortUrl:{
        required: true,
        type: String,
    },
    visits:{
        required: false,
        default:0
    }
}, { timestamps: true });


export const classAliasUrl = mongoose.model<classAliasDocument>("classAliasUrl", classAliasSchema);
