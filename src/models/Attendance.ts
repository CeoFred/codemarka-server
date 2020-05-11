import mongoose from "mongoose";

export type ClassroomAttendanceDocument = mongoose.Document & {
    kid: string;
    list: any[];
    classroomkid: string;
    csvName: string;
};


const attendanceScehema = new mongoose.Schema({
    kid:{
        type:String,
        required: true
    },
    classroomkid: {
        type: String,
        required: true,
        ref:"Classroom"
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
            classExpertiseLevel:{
                type: String
            },
            totalTimeSpent: {
                type: Number
            },
            lastExitTime: {
                type: Number
            },
            lastEntryTime: {
                type: Date
            }
        }
    ],
    csvName:{
        type: String
    }
}, { timestamps: true });

export const ClassroomAttendance = mongoose.model<ClassroomAttendanceDocument>("ClassroomAttendance", attendanceScehema);
