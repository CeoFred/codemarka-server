import mongoose from "mongoose";
import crypto from "crypto";
import { randomString } from "../helpers/utility";

import {  RoomParticipant } from "../socket/SocketInterface";
export type ClassroomDocument = mongoose.Document & {
    owner: string;
    status: number;
    classVisibility: string;
    participants: RoomParticipant[];
    numberInClass: number;
    subAdmins: [Record<string, any>];
    likes: [Record<string, any>];
    pinnedMessages: [Record<string, any>];
    ratings: [Record<string, any>];
    blocked: [Record<string, any>];
    gravatarUrl: string;
    maxUsers: number;
    visits: number;
    schedule: Date;
    location: number;
    kid: string;
    shortUrl: string;
    name: string;
    gravatar: (p: number) => void;
    regenerate: () => string;
    description: string;
    topic: string;
    isTakingAttendance: boolean;
    isBroadcasting: boolean;
    actions: any[];
    reports: any[];
    questions: any[];
    settings: any;
    messages: any[];
    tokens: {type: string; for: string; createdat: string; token: string}[];
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
    isBroadcasting:{
        type:Boolean,
        default: false,
        required: true
    },
    owner: {
        type: String,
        required: true,
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
    schedule:{
        type: Date,
        required: true,
        default: new Date()
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
    participants: {
        type: [],
    },
    pinnedMessages: [Object],
    gravatarUrl: String,
    maxUsers: Number    ,
    Usersjoined: [Object],
    actions:[Object],
    pin: {
        default: "0000",
        type: String
    },
    subscribers: [Object],
    reports: [Object],
    questions: [Object],
    settings:{
        mutedAll: {
            default: false,
            type: Boolean
        },
        videoOff:{
            default: true,
            type: Boolean
        }
    },
    tokens: {
        type: [ { type: String , token: String, for: String , createdat: String, expiresOn: String}],
        default: []
    }
}, { timestamps: true });

/**
 * Helper method for getting user's gravatar.
 */
classroomSchema.methods.gravatar = function (size: number = 200): void {
    
    const md5 = crypto.createHash("md5").update(this.name).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${size}&d=identicon`;
};

classroomSchema.methods.regenerate = function (): void {
    const md5 = crypto.createHash("md5").update(randomString(33)).digest("hex");
    this.gravatarUrl = `https://gravatar.com/avatar/${md5}?s=${200}&d=identicon`;
    return this.gravatarUrl;
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
