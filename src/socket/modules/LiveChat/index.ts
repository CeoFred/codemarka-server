import {Socket} from "socket.io";
import uuidv4 from "uuid/v4";
import moment from "moment";

import {  ImageUploadData,NewMessageInterface,MessageReaction,NewThreadMessage} from "../../SocketInterface";
import { Classroom,ClassroomDocument } from "../../../models/classroom";
import { UserDocument, User } from "../../../models/User";
import { CommunityDocument,Community } from "../../../models/Community";
import cloudi from "../../../config/cloudinary";

export default function webrtcSocketFactory(socket: any, io: Socket): void{

    socket.on("newMessage", (data: NewMessageInterface): void => {
        function sendSocketMessage(u: any): void {

            const msgId: string = uuidv4();
            const msgObject: any = {
                timeSent: moment(data.time).format("LT"),
                msgId, 
                name: u.username || u.communityName,
                by: data.user,
                msg: data.message,
                color: data.messageColor,
                oTime: data.time,
                type:"text",
                reactions: [],
                isDeleted: false,
                wasEdited: false,
                editHistory: [],
                mentions: [],
                hashTags: [],
                sent: true,
                thread: [],
                isThread:false,
                subscribers: []
            };
            Classroom.findOneAndUpdate({ kid: data.class, status: 2 },
                {
                    $push: {
                        messages: msgObject
                    }
                },
                { upsert: true },
                function (err, doc: object) {
                    if (err) {
                        console.log(err);
                    } else if (doc) {
                        //do stuff
                        io.in(socket.room).emit("nM",
                            {
                                ...msgObject
                            });
                    }
                }
            );
        }

        User.findOne({ kid: data.user }).then((u: UserDocument) => {
            if (u) {
                return sendSocketMessage(u);
            } else {
                Community.findOne({ kid: data.user },(err,acc: CommunityDocument) => {
                    if(err){

                    } else if(!acc){
                        console.log("user that sent message is not registered");
                    } else {
                        return sendSocketMessage(acc);
                    }
                });
            }

        });
    });

    socket.on("user_typing", (data: any): void => {
        io.in(socket.room).emit("utyping", {
            ...data
        });
    });

    socket.on("user_typing_cleared", (data: any): void => {
        io.in(socket.room).emit("utyping_cleared", {
            ...data
        });
    });
    socket.on("image_upload", (data: ImageUploadData) => {
        cloudi.uploader.upload(data.data, 
            function(error, result) {
                if(result){
                    socket.emit("image_upload_complete",result,data);
                     
                    function sendSocketMessage(u: any): void {

                        const msgId = uuidv4();
                        const msgObject: any = {
                            timeSent: moment(data.time).format("LT"),
                            msgId, 
                            name: u.username || u.communityName,
                            by: data.by,
                            color: data.messageColor,
                            oTime: data.time,
                            type:"image",
                            result,
                            sent:true,
                            isDeleted: false,
                            isThread:false,
                            subscribers:[],
                            mentions:[],
                            thread:[],
                            reactions: [],
                            wasEdited: false,
                            editHistory:[],
                            hashTags: [],
                        };
                        Classroom.findOneAndUpdate({ kid: data.room, status: 2 },
                            {
                                $push: {
                                    messages: msgObject
                                }
                            },
                            { upsert: true },
                            function (err, doc: object) {
                                if (err) {
                                    console.log(err);
                                } else if (doc) {
                                    //do stuff
                                    io.in(socket.room).emit("new_image_message",
                                        {
                                            ...msgObject
                                        });
                                }
                            }
                        );
                    }

                    User.findOne({ kid: data.by }).then((u: UserDocument) => {
                        if (u) {
                            return sendSocketMessage(u);
                        } 
                    });
                }
            });
    });

    socket.on("edit_message",(data: NewThreadMessage) => {
        // console.log(data);
        Classroom.findOne({kid: data.room}).then((classroom: ClassroomDocument) => {
            if(classroom && classroom.messages){
                const messageFoundAndActive: any[]  = classroom.messages.find((message: NewMessageInterface) => message.msgId === data.messageId && !message.isDeleted);
                if(messageFoundAndActive){
                        
                    classroom.messages = classroom.messages.map((message: NewMessageInterface): any => {
                        if(message.msgId === data.messageId && data.content !== message.msg){
                            message.msg = data.content;
                            message.wasEdited = true;
                            message.editHistory.push({time:data.time, message: data.content});
                            return message;        socket.on("image_upload", (data: ImageUploadData) => {
                                cloudi.uploader.upload(data.data, 
                                    function(error, result) {
                                        if(result){
                                            socket.emit("image_upload_complete",result,data);
                     
                                            function sendSocketMessage(u: any): void {

                                                const msgId = uuidv4();
                                                const msgObject: any = {
                                                    timeSent: moment(data.time).format("LT"),
                                                    msgId, 
                                                    name: u.username || u.communityName,
                                                    by: data.by,
                                                    color: data.messageColor,
                                                    oTime: data.time,
                                                    type:"image",
                                                    result,
                                                    sent:true,
                                                    isDeleted: false,
                                                    isThread:false,
                                                    subscribers:[],
                                                    mentions:[],
                                                    thread:[],
                                                    reactions: [],
                                                    wasEdited: false,
                                                    editHistory:[],
                                                    hashTags: [],
                                                };
                                                Classroom.findOneAndUpdate({ kid: data.room, status: 2 },
                                                    {
                                                        $push: {
                                                            messages: msgObject
                                                        }
                                                    },
                                                    { upsert: true },
                                                    function (err, doc: object) {
                                                        if (err) {
                                                            console.log(err);
                                                        } else if (doc) {
                                                            //do stuff
                                                            io.in(socket.room).emit("new_image_message",
                                                                {
                                                                    ...msgObject
                                                                });
                                                        }
                                                    }
                                                );
                                            }

                                            User.findOne({ kid: data.by }).then((u: UserDocument) => {
                                                if (u) {
                                                    return sendSocketMessage(u);
                                                } 
                                            });
                                        }
                                    });
                            });

                        } 
                        return message;
                    });   

                    classroom.markModified("messages");
                    classroom.save((err, room) => {
                        // console.log(err);
                        if(err) socket.emit("edit_message_error","Failed to edit message");
                        const messageForEditing: any[]  = room.messages.filter((message: NewMessageInterface) => message.msgId === data.messageId && !message.isDeleted);

                        io.in(socket.room).emit("message_edit_or_delete_success",messageForEditing[0]);
                    });
                } else {
                    return socket.emit("edit_message_error","Message Deleted");
                }
            }
        }).catch((err) => {
            // console.log(err);
            socket.emit("edit_message_error","Failed to find room");
        });
    });

    socket.on("delete_message",(data: NewThreadMessage) => {
        Classroom.findOne({kid: data.room}).then((classroom: ClassroomDocument) => {
            if(!classroom) socket.emit("delete_message_error","Room not Found or Ended");
            const messageForThread: any[]  = classroom.messages.filter((message: NewMessageInterface) => message.msgId === data.messageId && !message.isDeleted);
            if(!messageForThread[0]) socket.emit("edit_message_error","Message Deleted");

            classroom.messages = classroom.messages.map((message: NewMessageInterface): any => {
                if(message.msgId === data.messageId){                        
                    message.isDeleted = true;
                    return message;
                } 
                return message;
            });

            // console.log(classroom.messages);
            classroom.markModified("messages");
            classroom.save((err, room) => {
                console.log(err);
                if(err) socket.emit("delete_message_error","Failed to delete message");
                const messageForThread: any[]  = room.messages.filter((message: NewMessageInterface) => message.msgId === data.messageId);

                io.in(socket.room).emit("message_edit_or_delete_success",messageForThread[0]);
            });

        }).catch((err) => {
            console.log(err);
            socket.emit("edit_message_error","Failed to find room");
        });
    });
    socket.on("add_reaction_to_message", (emojiObject: any, messageId: string,room: string,userid: string) => {
        Classroom.findOne({kid: room}).then((classroom: ClassroomDocument) => {
            if(classroom){
                const message: any[]  = classroom.messages.filter((message: NewMessageInterface) => message.msgId === messageId && !message.isDeleted);
                if(!message[0]) socket.emit("thread_error","Message Deleted");

                classroom.messages = classroom.messages.map((message: NewMessageInterface): any => {
                    if(message.msgId === messageId){
                        // message Target

                        let messageReactions: any = message.reactions; // check reactcions

                        const reactionExists = messageReactions.find(((reaction: MessageReaction) => reaction.emojiObject.unified === emojiObject.unified && reaction.count));

                        if(reactionExists){
                            messageReactions = messageReactions.map((reaction: MessageReaction) => {
                                if(reaction.emojiObject.unified === emojiObject.unified){
                                    const isSubscriber = reaction.subscribers.find((subscriber: string) => subscriber === userid);
                                    if(!isSubscriber) reaction.subscribers.push(userid);
                                    if(isSubscriber){
                                        reaction.subscribers = reaction.subscribers.filter((subscriber: string) => subscriber !== userid);
                                        reaction.count--;
                                    } else {
                                        reaction.count++;
                                    }   

                                    // chceck if this user has reacted before
                                    
                                       
                                }
                                return reaction;
                            });
                            messageReactions =  messageReactions.filter((reaction: MessageReaction) => reaction.count > 0);

                        } else {
                            messageReactions.push({emojiObject,count:1,subscribers:[userid]});
                        }
                        message.reactions = messageReactions;
                        return message;
                    } 
                    return message;
                });

                // console.log(classroom.messages);
                classroom.markModified("messages");
                classroom.save((err, room) => {
                    console.log(err);
                    if(err) socket.emit("thread_error","Failed to add Thread");
                    const message: any[]  = room.messages.filter((message: NewMessageInterface) => message.msgId === messageId && !message.isDeleted);
                    io.in(socket.room).emit("new_message_reaction",message[0]);
                });
            } else {
                socket.emit("thread_error","Room not Found or Ended");
            }
          

        }).catch((err) => {
            console.log(err);
            socket.emit("thread_error","Failed to find room");
        });
    });

    socket.on("new_thread_reply",(data: NewThreadMessage) => {
        // push message to everyone that responded to thread
        Classroom.findOne({kid: data.room}).then((classroom: ClassroomDocument) => {
            if(!classroom) socket.emit("thread_error","Room not Found or Ended");
            const messageForThread: any[]  = classroom.messages.filter((message: NewMessageInterface) => message.msgId === data.messageId && !message.isDeleted);
            if(!messageForThread[0]) socket.emit("thread_error","Message Deleted");

            classroom.messages = classroom.messages.map((message: NewMessageInterface): any => {
                if(message.msgId === data.messageId){
                        
                    const messagesThread: any = message.thread ? message.thread : [];
                    messagesThread.push({...data,threadId: uuidv4(),reactions:[]});

                    message.thread = messagesThread;
                    message.isThread = true;
                    const isSubscriber = message.subscribers.find((subscriber: any) => subscriber.kid === data.reply_by.kid);
                    if(!isSubscriber) message.subscribers.push(data.reply_by);
                    return message;
                } 
                return message;
            });

            // console.log(classroom.messages);
            classroom.markModified("messages");
            classroom.save((err, room) => {
                console.log(err);
                if(err) socket.emit("thread_error","Failed to add Thread");
                const messageForThread: any[]  = room.messages.filter((message: NewMessageInterface) => message.msgId === data.messageId && !message.isDeleted);

                io.in(socket.room).emit("thread_reply",messageForThread[0].thread,messageForThread[0].subscribers);
            });

        }).catch((err) => {
            console.log(err);
            socket.emit("thread_error","Failed to find room");
        });
    });

};