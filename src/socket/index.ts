import { chat } from "./config";
import express from "express";
import fs from "fs";

import { Classroom } from "../models/classroom";
import { classWeb } from "../models/classWebFiles";

import { User } from "../models/User";

export default (server: express.Application) => {
    const io = require("socket.io")(server, chat);
    const clients: any[] = [];
    const nsp = io.of("/classrooms");

    nsp.on("connection", function (socket: any) {

        console.log("New socket connection to classroom");

        // register current client  
        clients[socket.id] = socket.client;

        interface JoinObj {
            userId: string;
            classroom_id: string;
            username: string;
        }

        // event when someone joins a class
        socket.on("join", (data: JoinObj) => {

            socket.user = data.userId;
            socket.room = data.classroom_id;
            socket.username = data.username;


            Classroom.findOne({ _id: data.classroom_id, status: 2 }).then((d: any) => {
                if (d) {
                    // console.log(d);
                    socket.emit("updateMsg", { by: "server", msgs: d.messages, type: "oldMsgUpdate" });

                    socket.join(data.classroom_id, () => {

                        nsp.to(data.classroom_id).emit("someoneJoined",
                            {
                                by: "server",
                                msg: data.userId + " joined",
                                for: data.userId,
                                name: data.username,
                                type: "sJoin"
                            });

                        classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                            if (!d && d === null) {
                                socket.emit("classroomFilesError", "Files not found");
                                console.log("Web files not found");
                            } else {

                                const cssfileId = d.css;
                                const jsFileId = d.js;
                                const htmlFileId = d.html;

                                if(!cssfileId || !jsFileId || !htmlFileId){
                                    socket.emit("classroomFilesError","File ID not found");
                                }

                                const classFilesDir = `${__dirname}/../classroomFiles/${data.classroom_id}/`;

                                fs.readdir(classFilesDir,{withFileTypes:true},(err,files) => {

                                    if(err){
                                        console.log(err);
                                        socket.emit("classroomFilesError","File Directory Not Found");
                                    }
                                    else {
                                        let htmlFilePath: string, cssFilePath: string, jsFilePath: string;
                                        let htmlFileContent: any , cssFileContent: any, jsFileContent: any;
                                        // Loop through files inclassroom files
                                        files.forEach( element => {

                                            // read each file in classroom folder
                                            if (element.name.includes("css")) {
                                                cssFilePath = `${classFilesDir}/${element.name}`;
                                                cssFileContent = fs.readFileSync(cssFilePath,"utf8");
                                            }

                                            if (element.name.includes("js")) {
                                                jsFilePath = `${classFilesDir}/${element.name}`;
                                                jsFileContent = fs.readFileSync(jsFilePath,"utf8");

                                            }

                                            if (element.name.includes("html")) {
                                                htmlFilePath = `${classFilesDir}/${element.name}`;
                                                htmlFileContent = fs.readFileSync(htmlFilePath,"utf8");

                                            }                                
                                        });
                                        const ht = {
                                            id : htmlFileId,
                                            content : htmlFileContent
                                        };
                                        const cs = {
                                            id : cssfileId,
                                            content : cssFileContent
                                        };
                                        socket.emit("class_files",cs,ht);
                                    }
                                
                                });

                            }
                        });
                    });
                } else {
                    console.log("classroom not found");
                    socket.emit("classroomError", null);
                }
            }).catch(e => {
                console.log(e);
            });
        });



        socket.on("leave", () => {
            // socket.leave(data.classroom_id)
            console.log("left", socket.room);

            // socket.broadcast.to(data.classroom_id).emit('left', {from:'server',msg:`someone left`});
            socket.leave(socket.room, () => {
                for (const key in socket.rooms) {
                    if (socket.rooms.hasOwnProperty(key)) {
                        const element = socket.rooms[key];
                        console.log(`${key} - ${element}`);
                    }
                }
            });
            socket.broadcast.to(socket.room).emit("updatechat_left", "SERVER", socket.user + " has left this room");

        });
        interface NewMessageInterface {
            message: string;
            class: string;
            user: string;
        }

        socket.on("newMessage", (data: NewMessageInterface) => {

            User.findOne({ _id: data.user }).then(u => {
                if (u) {
                    Classroom.findByIdAndUpdate({ _id: data.class, status: 2 },
                        { $push: { messages: { name: u.username, by: data.user, msg: data.message } } },
                        { upsert: true },
                        function (err, doc: object) {
                            if (err) {
                                console.log(err);
                            } else {
                                //do stuff
                                nsp.to(data.class).emit("nM",
                                    {
                                        by: data.user,
                                        msg: data.message,
                                        name: u.username
                                    });


                            }
                        }
                    );

                }

            });
        });

        interface EditorChangedInterface {
            class: string;
            user: string;
            content: string;
            file: string;
            id: string;
        }
        
        socket.on("editorChanged", (data: EditorChangedInterface) => {
            
            const classFilesDir = `${__dirname}/../classroomFiles/${data.class}/`;
          
            fs.readdir(classFilesDir,{withFileTypes:true},(err,files) => {
                if(err){
                    socket.emit("classroomFilesError","File Directory Not Found");
                    console.error(err);
                }
                else {

                    files.forEach(element => {
                        if (element.name.includes(data.file) && element.name === `${data.id}.${data.file}`) {
                            fs.writeFile(`${classFilesDir}${element.name}`,data.content,(err) => {
                                if(err) console.error(err);
                                socket.emit("class_files_updated",{
                                    ...data
                                });
                            
                            });   
                        } 


                    });
                }
            });
        });


        socket.on("disconnect", function () {
            delete clients[socket.id];
            socket.leave(socket.room);
            console.log(`${socket.id} disconnected`);
        });
    });


};
