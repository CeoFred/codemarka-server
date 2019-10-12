import mongoose from "mongoose";

export type ClassroomDocument = mongoose.Document & {
    
};


const classroomSchema = new mongoose.Schema({
   
}, { timestamps: true });


export const Classroom = mongoose.model<ClassroomDocument>("Classroom", classroomSchema);
