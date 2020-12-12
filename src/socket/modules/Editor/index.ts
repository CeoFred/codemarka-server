import {Socket} from "socket.io";
import Mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import crypto from "crypto";
import sgMail  from "@sendgrid/mail";

import { classWeb,ClassroomWebFileDocument } from "../../../models/classWebFiles";
import { User } from "../../../models/User";
import { Classroom, ClassroomDocument } from "../../../models/classroom";
import {EditorSettingsData, EditorChangedInterface} from "../../SocketInterface";
import { randomString } from "../../../helpers/utility";

export default function webrtcSocketFactory(socket: Socket | any, io: Socket): void{

    socket.on("invite_to_collaborate", (emailOrUsername: string, class__: string) => {
        console.log(emailOrUsername, class__);
        if(!emailOrUsername ) {
            socket.emit("action_error","Failed to send Invitation", "invalid_username");
            return;
        }

        Classroom.findOne({kid: class__ }, (err: Mongoose.Error, room: ClassroomDocument) => {
            if(err){
                console.log(err);
                socket.emit("action_error","Failed to send Invitation",err);
                return;
            } else if(room){

                const { participants } =  room;
                const hasPriviledge =  participants.find(participant => {
                    return participant.kid === socket.user && (participant.isowner || participant.accessControls.editors.administrative); 
                });

                if(!hasPriviledge){
                    
                    console.log("invalid privileges");
                    socket.emit("editor_invitation_action_error", "Invalid Priviledge");
                    return;

                } else {
                    // check if user already in room
                    User.findOne({ $or : [ { email: emailOrUsername }, { username: emailOrUsername}]}, (err: Mongoose.Error, user) => {
                        if(err) {
                            console.log(err);
                            socket.emit("editor_invitation_action_error"," Failed to send Invitation", err);
                            return;
                        } else if ( user ){
                            const { kid, username, email } =  user;
                            const userIsInRoom =  participants.find(participant => {
                                return participant.kid === kid && (participant.inClass); 
                            });
                            if(userIsInRoom){
                                console.log(userIsInRoom);
                                if(!userIsInRoom.accessControls.editors.administrative || !userIsInRoom.accessControls.editors.write){
                                    socket.to(userIsInRoom.socketid).emit("editor_collaboration_invitation");
                                    socket.emit("editor_invitation_action_success", true,username);
                                } else {
                                    socket.emit("editor_invitation_action_error", false, "User already a collaborator.");
                                }
                            } else {
                                console.log("external iv");
                                // send invitation mail
                                const buffer = crypto.randomBytes(482);
                                const token = buffer.toString("hex");

                                room.tokens.push({ type: "editor_collaboration", for: kid, token, createdat: String(new Date())});
                                let emailTemplate;
                                const to = username;

                                ejs
                                    .renderFile(path.join(__dirname, "../../../../views/mail/collaborationInvitation.ejs"),
                                        {
                                            roomLink: room.kid,
                                            token,
                                            from:socket.username,
                                            roomName: room.name,
                                            to,
                                        })
                                    .then(result => {
                                        console.log("sending mail");
                                        emailTemplate = result;
                                        const message = {
                                            to: email,
                                            from: { email: "no-reply@codemarka.dev", name: "codemarka" },
                                            subject: "Invitation To Collaborate On Codemarka",
                                            html: emailTemplate
                                        };
                                        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                                        sgMail.send(message).then(sent => {
                                            console.log(sent[0]);
                                            socket.emit("editor_invitation_action_success",true,to);
                                        }).catch((err) => {
                                            console.log(err.response.body);
                                            socket.emit("editor_invitation_action_error", false, "Failed, try again!");
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err);   
                                        
                                    });
                            }
                        } else {
                            console.log("user not found");
                            socket.emit("editor_invitation_action_error", false, "user not found");
                        }
                    });
                }
            } else {
                console.log("room not found");
                socket.emit("editor_invitation_action_error", false, "Failed to process");

            }
        });

        

    });

    socket.on("editor_settings_changed", (editorSettingsData: EditorSettingsData):  void => {
        const { preprocessor, externalCDN} = editorSettingsData;

        // update settings
        classWeb.findOne({classroomKid: editorSettingsData.classroom},(err: Error, classWebDoc: ClassroomWebFileDocument) => {
            const editorName  = editorSettingsData.editor;

            if(!err && classWebDoc){
                    
                const mapCDNToId = externalCDN.map(cdn => {
                    return {url: cdn, id: randomString(20)};
                });
                const newSettings = { preprocessor, externalCDN: mapCDNToId };
                if(editorName === "css"){
                        
                    classWebDoc.css.settings =  newSettings;

                } else if(editorName === "js"){
                    classWebDoc.js.settings = newSettings;
                }

                classWebDoc.save((err,updatedSettings) => {
                    if(!err && updatedSettings){
                        socket.emit("editor_settings_update_feedback",newSettings);
                    } else {
                        socket.emit("editor_settings_update_feedback",false);
                    }
                });
            } else {
                socket.emit("editor_settings_update_feedback",false);
            }
        });

    });
    socket.on("editorChanged", (data: EditorChangedInterface) => {
        try {
            classWeb.findOne({classroomKid:data.kid}, (err,res: any) => {

                if(err) {
                    socket.emit("classroom_error");
                    console.log(err);
                };
                if(res === null) {
                    socket.emit("editor_update_error","class not found");
                    console.log("class not found",res);
                }
                if(res){
                    res[data.file].content = data.content;
                    res.save((err: any,doc: any) => {
                        if(err) {
                            socket.emit("classroom_error");
                            console.log("Error updating editors remotely",err);
                        }
                        if(doc) { 
                            io.in(`preview--${data.kid}`).emit("preview_changed",data.file);
                            io.in(socket.room).emit("class_files_updated",{...data});
                            // console.log("Class File Updated", doc);
                        }
                    });
                }
            });

        } catch(e) {
            console.log(e);
            io.in(socket.room).emit("editor_update_error","Failed to Update On Remote Server");
        } 
            
        // console.log(classfiles);

            

    });

}