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
    visits: number;
    location: number;
    kid: string;
    shortUrl: string;
    name: string;
    gravatar: (p: number) => void;
    description: string;
    topic: string;
    isTakingAttendance: boolean;
};


const classroomSchema = new mongoose.Schema({
    isTakingAttendance:{
        type: Boolean,
        required: true
    },
    kid: {
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
        default: "No description",
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
    Usersjoined: [Object]
}, { timestamps: true });

/**
 * Helper method for getting user's gravatar.
 */
classroomSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.name).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};


classroomSchema.virtual("createdBy",{
    ref:"User",
    localField: "owner",
    foreignField: "kid",
    justOne: true
});

classroomSchema.pre("findOne",function(){
    this.populate("createdBy");
});

classroomSchema.post("save",function(doc, next){
    doc.populate("createdBy").execPopulate().then(function(){
        next();
    });
});
export const Classroom = mongoose.model<ClassroomDocument>("Classroom", classroomSchema);
