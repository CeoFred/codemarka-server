import mongoose from "mongoose";

export type ClassroomAttendanceDocument = mongoose.Document & {
    kid: string;
};


const attendanceScehema = new mongoose.Schema({
    kid:{
        type:String,
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
            }
        }
    ],
    classroomkId: {
        required: true,
        type: String
    }
}, { timestamps: true });

export const ClassroomAttendance = mongoose.model<ClassroomAttendanceDocument>("ClassroomAttendance", attendanceScehema);
