import mongoose from "mongoose";

export type classReportSchema = mongoose.Document & {
    kid: string;
    report: string;
    user: string;
    reportId: string;
};


const reportSchema = new mongoose.Schema({
    Kid: {
        type: String,
        required: true
    },
    user:{
        required: true,
        type: String,
    },
    report:{
        required: false,
        default:"",
        type: String
    },
    reportId: {
        required: true,
        type: String
    },
    timeSent: {
        type: Date,
        required: true
    }
}, { timestamps: true });


export const classroomReport = mongoose.model<classReportSchema>("classroomReport", reportSchema);
