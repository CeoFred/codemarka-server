import mongoose from "mongoose";

export type ClassroomDocument = mongoose.Document & {
    
};


const classWebFiles = new mongoose.Schema({
    classroomId:{
        type: String,
        required: true
    },
    js:{
        type: String,
        required: true,
    },
    css:{
        type: String,
        required:true
    },
    html: {
        type: String,
        required: true
    }
}, { timestamps: true });


export const classWeb = mongoose.model<ClassroomDocument>("classWebFiles", classWebFiles);
