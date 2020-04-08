import mongoose from "mongoose";
import crypto from "crypto";

export type ClassroomDocument = mongoose.Document & {
    owner: string;
    status: number;
    classVisibility: string;
    students: [Record<string, any>];
    subAdmins: [Record<string, any>];
    likes: [Record<string, any>];
    pinnedMessages: [Record<string, any>];
    ratings: [Record<string, any>];
    blocked: [Record<string, any>];
    startTime: any;
    startDate: any;
    maxUsers: number;
    Kid: string;
    shortUrl: string;
    name: string;
    gravatar: (p: number) => void;
};


const classroomSchema = new mongoose.Schema({
    Kid: {
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    topic:{
        type: String,
        required: true,
    },
    startDate:{
        type: Date,
        required:true
    },
    owner: {
        type: String,
        required: true
    },
    subAdmins : [Object],
    classType:{
        type: String,
        default:"Basic web App"
    },
    blocked: [Object],
    description:{
        required: true,
        type: String
    },
    classVisibility: {
        type: String,
        required: true,
        default:"Public"
    },
    startTime:{
        type: String,
        required: true
    },
    status: {
        default: 1,
        type: Number
    },
    numberInClass: {
        default:0,
        type: Number
    },
    ratings:[Object],
    messages: [Object],
    visits: {
        default:0,
        type: Number
    },
    likes : [Object],
    location: {
        required: false,
        default: "Nigeria",
        type: "String"
    },
    shortUrl:{
        required: false,
        type: String,
        default:"https://cmarka.xyz"
    },
    students: [Object],
    pinnedMessages: [Object],
    gravatarUrl: String,
    maxUsers: Number    ,
}, { timestamps: true });

/**
 * Helper method for getting user's gravatar.
 */
classroomSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.name).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const Classroom = mongoose.model<ClassroomDocument>("Classroom", classroomSchema);
