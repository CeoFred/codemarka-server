import { chat } from "./config";
import express from "express";
import fs from "fs";
import moment from "moment";
import uuidv4 from "uuid/v4";

import { Classroom, ClassroomDocument } from "../models/classroom";
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
        let classfiles: any[] = [];

        // event when someone joins a class
        socket.on("join", (data: JoinObj) => {

            socket.user = data.userId;
            socket.room = data.classroom_id;
            socket.username = data.username;
            socket.userModel;
            // find user and update
            User.findOne({ _id: data.userId }).then(user => {
                let studentObj;

                if (user && user !== null) {

                    studentObj = {
                        _id: user._id,
                        username: user.username
                    };

                    Classroom.findOneAndUpdate({ _id: data.classroom_id, status: 2 },
                        {
                            $push:
                                { students: studentObj },
                            $inc: { numberInClass: 1 }
                        },
                        { new: true }).then((d: any) => {
                        if (d) {
                            console.log(d.students);
                            console.log(d.numberInClass);
                            socket.emit("updateMsg", { by: "server", msgs: d.messages, type: "oldMsgUpdate" });

                            socket.join(data.classroom_id, () => {
                                nsp.to(data.classroom_id).emit("someoneJoined",
                                    {
                                        by: "server",
                                        msg: data.userId + " joined",
                                        for: data.userId,
                                        name: data.username,
                                        type: "sJoin",
                                        msgId: uuidv4()
                                    });
                                    
                                classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                                    if (!d && d === null) {
                                        socket.emit("classroomFilesError", "Files not found");
                                        console.log("Web files not found");
                                    } else {

                                        const cssfileId = d.css;
                                        const jsFileId = d.js;
                                        const htmlFileId = d.html;

                                        if (!cssfileId || !jsFileId || !htmlFileId) {
                                            socket.emit("classroomFilesError", "File ID not found");
                                        }

                                        const classFilesDir = `${__dirname}/../../main/classrooms/${data.classroom_id}/`;

                                        fs.readdir(classFilesDir, { withFileTypes: true }, (err, files) => {

                                            if (err) {
                                                console.log(err);
                                                socket.emit("classroomFilesError", "File Directory Not Found");
                                            }
                                            else {
                                                let htmlFilePath: string, cssFilePath: string, jsFilePath: string;
                                                let htmlFileContent: any, cssFileContent: any, jsFileContent: any;
                                                // Loop through files inclassroom files
                                                files.forEach(element => {
                                                    classfiles.push(element);
                                                    // read each file in classroom folder
                                                    if (element.name.includes("css")) {
                                                        cssFilePath = `${classFilesDir}/${element.name}`;
                                                        cssFileContent = fs.readFileSync(cssFilePath, "utf8");
                                                    }

                                                    if (element.name.includes("js")) {
                                                        jsFilePath = `${classFilesDir}/${element.name}`;
                                                        jsFileContent = fs.readFileSync(jsFilePath, "utf8");

                                                    }

                                                    if (element.name.includes("html")) {
                                                        htmlFilePath = `${classFilesDir}/${element.name}`;
                                                        htmlFileContent = fs.readFileSync(htmlFilePath, "utf8");

                                                    }
                                                });
                                                const ht = {
                                                    id: htmlFileId,
                                                    content: htmlFileContent
                                                };
                                                const cs = {
                                                    id: cssfileId,
                                                    content: cssFileContent
                                                };
                                                const js = {
                                                    id: jsFileId,
                                                    content: jsFileContent
                                                };
                                                socket.emit("class_files", cs, ht, js);
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
                }
            }).catch(err => {

                socket.emit("ErrorFetchingUser");

            });



        });



        socket.on("leave", (data: JoinObj) => {
            // socket.leave(data.classroom_id)
            delete clients[socket.id];
            socket.leave(socket.room);

            nsp.to(socket.room).emit("updatechat_left", {
                by: "server",
                msg: socket.username + " left",
                for: socket.user,
                name: socket.username,
                type: "sLeft",
                timeSent: moment().format("LT"),
                msgId: uuidv4()
            });

            Classroom.findById(socket.room, (err, room: ClassroomDocument) => {

                if (err) {

                } else if (room && room !== null) {
                    // find user in student field array
                    room.students.forEach((user: { _id: any }, i) => {
                        if (user._id == socket.user) {
                            let newclassusers: any[];

                            newclassusers = room.students.filter((s: any,i) => {
                                return s._id != socket.user;
                            });
                            
                            Classroom.findOneAndUpdate({ _id: socket.room }, {$inc: { numberInClass: -1 }, students: newclassusers },{new:true}, (err, doc) => {
                                if (err) console.log("error");
                                socket.disconnect();
                            }); 
                        }
                    });
                }

            });

        });
        interface NewMessageInterface {
            message: string;
            class: string;
            user: string;
        }

        socket.on("newMessage", (data: NewMessageInterface) => {
            User.findOne({ _id: data.user }).then(u => {
                if (u) {
                    const msgId = uuidv4();
                    Classroom.findByIdAndUpdate({ _id: data.class, status: 2 },
                        {
                            $push: {
                                messages: {
                                    timeSent: moment().format("LT"),
                                    msgId, name: u.username, by: data.user, msg: data.message
                                }
                            }
                        },
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
                                        name: u.username,
                                        timeSent: moment().format("LT"),
                                        msgId
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
            const classFilesDir = `${__dirname}/../../main/classrooms/${data.class}/`;

            classfiles.forEach(element => {
                if (element.name.includes(data.file) && element.name === `${data.id}.${data.file}`) {
                    fs.writeFile(`${classFilesDir}${element.name}`, data.content, (err) => {
                        if (!err) {
                            nsp.emit("class_files_updated", {
                                ...data
                            });
                            console.log(`${element.name} updated`);
                        } else {
                            console.error(err);
                        }
                    });

                }
            });
        });

        socket.on("disconnect", function () {
            delete clients[socket.id];
            socket.leave(socket.room);

            nsp.to(socket.room).emit("updatechat_left", {
                by: "server",
                msg: socket.username + " left",
                for: socket.user,
                name: socket.username,
                type: "sLeft",
                timeSent: moment().format("LT"),
                msgId: uuidv4()
            });

            Classroom.findById(socket.room, (err, room: ClassroomDocument) => {

                if (err) {

                } else if (room && room !== null) {
                    // find user in student field array
                    room.students.forEach((user: { _id: any }, i) => {
                        if (user._id == socket.user) {
                            let newclassusers: any[];

                            newclassusers = room.students.filter((s: any,i) => {
                                return s._id != socket.user;
                            });
                            
                            Classroom.findOneAndUpdate({ _id: socket.room }, {$inc: { numberInClass: -1 }, students: newclassusers },{new:true}, (err, doc) => {
                                if (err) console.log("error");
                            }); 
                        }
                    });
                }

            });
            console.log(`${socket.username} disconnected`);
        });
    });
};
