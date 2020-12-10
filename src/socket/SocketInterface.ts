import { ClassroomDocument } from "../models/classroom";
export interface RoomParticipant {
    id: string;
    username: string;
    kid: string;
    avatar: string;
    socketid: string;
    inClass: boolean;
    accessControls: {
        editors: {
            read: boolean;
            write: boolean;
            upload: boolean;
            administrative: boolean;// includes inviting to collaborate
        };
        conversation: {
            read: boolean;
            write: boolean;
            administrative: boolean;// includes deleting another users message
        };
        videoConference: {
            read: boolean;
            write: boolean;
            administrative: boolean;// includes muting mics, removing and adding users
        };
    };
    hasRoomAccess: boolean;
    lastTimeEntry: Date;
    isowner: boolean;
    blocked: boolean;
}
export interface EditorSettingsData {
    classroom: string;
    preprocessor: any;
    externalCDN: any[];
    editor: string;
}
export interface EditorChangedInterface {
    class: string;
    user: string;
    content: string;
    file: string;
    id: any;
    kid: string;
}
export interface NewMessageInterface {
    message: string;
    msg: string;
    class: string;
    user: string;

    time: Date;
    msgId: string;
    messageColor: string;
    isThread: boolean;
    reactions: { emoji: string; userkid: string}[];
    isDeleted: boolean;
    wasEdited: boolean;
    editHistory: { message: string; time: Date}[];
    mentions?: [string];
    sent: boolean;
    hashTags: [string];
    subscribers: any;
    thread: any;
}
export interface JoinObj {
    userId: string;
    classroom_id: string;
    username: string;
    cdata: ClassroomDocument;
    entryTime: Date;
}

export interface ImageUploadData {
    data: string;
    by: string;
    name: string;
    time: string;
    messageColor: string;
    room: string;
}

export interface NewThreadMessage {
    content: string;
    reply_by: {
        kid: string;
        username: string;
        email: string;
        image: string;
    };
    time: Date;
    userInfo: string;
    room: string;
    messageId: string;
}

export interface MessageReaction {
    emojiObject: {
        id: string;
        name: string;
        unified: string;
        native: any;
        short_name: [string];
    };
    count: number;
    subscribers: [string] | string[];
}

export interface OfferPayload {
    target: {
        socketid: string;
    };
    caller: object;
    sdp: object;
}

export interface CandidateOffer {
    target: {
        socketid: string;
    };
    candidate: string;
    sender: string;
}

export interface VideoToggeleData {
    socketid: string;

    usersData: {
        displayImg: string;
        kid: string;
        id: string;
    };
}

export interface UserWEBRTC {
    socketid: string;
    kid: string;
}
