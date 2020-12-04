import mongoose from "mongoose";

export type ClassroomWebFileDocument = mongoose.Document & {
    classroomId: string;
    classroomKid: string;

    "js": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            externalCDN: Record<string, any>[];
        };
        lastupdateat: string;
        lastupdateby: string;
    };
    "css": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            externalCDN: Record<string, any>[];
        };
        lastupdateat: string;
        lastupdateby: string;
    };
    "html": {
        content: string;
        id: number;
        settings: {
            preprocessor: string;
            classes: Record<string, any>[];
        };
        lastupdateat: string;
        lastupdateby: string;
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
        },
        lastupdateat: {
            type: Date
        },
        lastupdateby: {
            type: String || null,
            default: null
        }
    },
    css:{
        content:{
            type:String,
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
        ,
        lastupdateat: {
            type: Date
        },
        lastupdateby: {
            type: String || null,
            default: null
        }
    },
    html: {
        content:{
            type:String,
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
        },
        lastupdateat: {
            type: Date
        },
        lastupdateby: {
            type: String || null,
            default: null
        }
    }
}, { timestamps: true });


export const classWeb = mongoose.model<ClassroomWebFileDocument>("classWebFiles", classWebFiles);
