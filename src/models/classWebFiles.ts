import mongoose from "mongoose";

export type ClassroomWebFileDocument = mongoose.Document & {
    classroomId: string;
    classroomKid: string;

    "js": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            externalCDN: Array<Object>;
        }
    };
    "css": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            externalCDN: Array<Object>;
        }
    };
    "html": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            classes: Array<Object>;
        }
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
        },
        settings:{
            preprocessor:{
                type:String,
                default:null
            },
            externalCDN:{
                type: Array,
                default:[]
            }
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
        },
        settings:{
            preprocessor:{
                type:String,
                default:null
            },
            externalCDN:{
                type: Array,
                default:[]
            }
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
        },
        settings:{
            preprocessor:{
                type:String,
                default:null
            },
            classes:{
                type: Array,
                default:[]
            }
        }
    }
}, { timestamps: true });


export const classWeb = mongoose.model<ClassroomWebFileDocument>("classWebFiles", classWebFiles);
