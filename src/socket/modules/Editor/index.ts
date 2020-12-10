import {Socket} from "socket.io";
import Mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import crypto from "crypto";

import { classWeb,ClassroomWebFileDocument } from "../../../models/classWebFiles";
import { User } from "../../../models/User";
import { Classroom, ClassroomDocument } from "../../../models/classroom";
import {EditorSettingsData, EditorChangedInterface} from "../../SocketInterface";
import { randomString } from "../../../helpers/utility";

export default function webrtcSocketFactory(socket: Socket | any, io: Socket): void{

    socket.on("invite_to_collaborate", (emailOrUsername: string) => {
        
        if(!emailOrUsername) {
            socket.emit("error","Failed to send Invitation", emailOrUsername);
            return;
        }

        Classroom.findOne({kid: socket.room }, (err: Mongoose.Error, room: ClassroomDocument) => {
            if(err){
                socket.emit("error","Failed to send Invitation",err);
                return;
            } else if(room){
                const { participants } =  room;
                const hasPriviledge =  participants.find(participant => {
                    return participant.kid === socket.user && (participant.isowner || participant.accessControls.editors.administrative); 
                });

                if(!hasPriviledge){
                    socket.emit("error", "Invalid Priviledge");
                    return;
                } else {
                    // check if user already in room
                    User.findOne({ $or : [ { email: emailOrUsername }, { username: emailOrUsername}]}, (err: Mongoose.Error, user) => {
                        if(err) {
                            socket.emit("error"," Failed to send Invitation", err);
                            return;
                        } else if ( user ){
                            const { kid, email } =  user;
                            const userIsInRoom =  participants.find(participant => {
                                return participant.kid === kid && (participant.inClass); 
                            });
                            if(userIsInRoom){
                                socket.emit("invitation_finalize", "inRoom");
                            } else {
                                // send invitation mail
                                room.tokens.push({ type: "editor_collaboration", for: kid, token: "d", createdat: String(new Date())});
                                let emailTemplate;
                                let capitalizedFirstName;
                                const to = email;

                                ejs
                                    .renderFile(path.join(__dirname, "views/welcome-mail.ejs"),
                                        {
                                            roomLink: capitalizedFirstName,
                                            token: "",
                                            from:"",
                                            roomName: ""
                                        })
                                    .then(result => {
                                        emailTemplate = result;
                                    })
                                    .catch(err => {
 
                                    });
                            }
                        }
                    });
                }
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