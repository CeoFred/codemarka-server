import mongoose from "mongoose";

export type ClassroomAttendanceDocument = mongoose.Document & {
    kid: string;
    list: any[];
    classroomkid: string;
};


const attendanceScehema = new mongoose.Schema({
    kid:{
        type:String,
        required: true
    },
    classroomkid: {
        type: String,
        required: true
    },
    list:[
        {
            username:{
                type: String
            },
            kid: {
                type: String
            },
            firstName: {
                type: String
            },
            lastName: {
                type: String
            },
            gender: {
                type: String
            },
            email: {
                type: String
            },
            phone:{
                type: String
            },
            joined:{
                type: Date
            },
            timeSpent: {
                type: Number
            },
            left: {
                type: Number
            }
        }
    ]
}, { timestamps: true });

export const ClassroomAttendance = mongoose.model<ClassroomAttendanceDocument>("ClassroomAttendance", attendanceScehema);
