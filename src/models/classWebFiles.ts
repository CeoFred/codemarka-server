import mongoose from "mongoose";

export type ClassroomDocument = mongoose.Document & {
    classroomId: string;
    classroomKid: string;

    js: {
        content: string;
        id: number;
    };
    css: {
        content: string;
        id: number;
    };
    html: {
        content: string;
        id: number;
    };
};


const classWebFiles = new mongoose.Schema({
    classroomId:{
        type: String,
        required: true
    },
    classroomKid:{
        type: String,
        required: true
    },
    js:{
        content:{
            type:String,
            required:true
        },
        id: {
            type:Number,
            required:true
        }
    },
    css:{
        content:{
            type:String,
            required: true,
        },
        id: {
            type:Number,
            required:true
        }
    },
    html: {
        content:{
            type:String,
            required: true,
        },
        id: {
            type:Number,
            required:true
        }
    }
}, { timestamps: true });


export const classWeb = mongoose.model<ClassroomDocument>("classWebFiles", classWebFiles);
