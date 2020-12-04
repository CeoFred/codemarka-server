import {Socket} from "socket.io";

import { classWeb,ClassroomWebFileDocument } from "../../../models/classWebFiles";
import {EditorSettingsData, EditorChangedInterface} from "../../SocketInterface";
import { randomString } from "../../../helpers/utility";

export default function webrtcSocketFactory(socket: any, io: Socket): void{

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