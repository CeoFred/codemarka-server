import mongoose from "mongoose";

export type ClassroomDocument = mongoose.Document & {
    owner: string;
};


const classroomSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    topic:{
        type: String,
        required: true,
        maxlength:30
    },
    startDate:{
        type: Date,
        required:true
    },
    owner: {
        type: String,
        required: true
    },
    classType:{
        type: String,
        default:"Basic web App"
    },
    description:{
        required: true,
        type: String
    },
    classVisibility: {
        type: String
    },
    startTime:{
        type: String,
        required: true
    },
    status: {
        default: "3",
        type: Number
    },
    numberInClass: {
        default:0,
        type: Number
    },
    messages: [Object],
    visits: {
        default:0,
        type: Number
    },
    likes : {
        default:0,
        type: Number
    },
    location: {
        required: false,
        default: "Nigeria",
        type: "String"
    },
    shortUrl:{
        required: false,
        type: String,
        default:"https://tinycolab.herokuapp.com"
    }
    ,
}, { timestamps: true });


export const Classroom = mongoose.model<ClassroomDocument>("Classroom", classroomSchema);
