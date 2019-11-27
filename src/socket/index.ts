import { chat } from "./config";
import express from "express";

import { Classroom } from "../models/classroom";

export default (server: express.Application) => {
    const io = require("socket.io")(server, chat);
    const clients: any[] = [];
    const nsp = io.of("/classrooms");

    nsp.on("connection", function (socket: any) {

        console.log("New socket connection to classroom");

        // register current client  
        clients[socket.id] = socket.client;

        interface JoinObj {
            user: string;
            classroom_id: string;
        }
        // event when someone joins a class
        socket.on("join", (data: JoinObj) => {

            socket.user = data.user;
            socket.room = data.classroom_id;

            socket.join(data.classroom_id, () => {

                // for (const key in socket.rooms) {
                //     if (socket.rooms.hasOwnProperty(key)) {
                //         const element = socket.rooms[key];
                //         console.log(`${key} - ${element}`);
                //     }
                // }
                nsp.to(data.classroom_id).emit("someoneJoined", "server", data.user + " joined", data.user);

            });

            Classroom.findOne({ _id: data.classroom_id, status: 2 }).then((d: any) => {
                if (d) {
                    console.log(d);
                    socket.emit("updateMsg", "server", d.messages);
                } else {
                    socket.emit("classroomError", null);
                }
            }).catch(e => {
                console.log(e);
            });
            //send prevous message to client
            // broadcast to existing sockets that someone joined

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

            Classroom.findByIdAndUpdate({ _id: data.class, status: 2 },
                { $push: { messages: { by: data.user, msg: data.message } } },
                { upsert: true },
                function (err, doc: object) {
                    if (err) {
                        console.log(err);
                    } else {
                        //do stuff
                        nsp.to(data.class).emit("nM", 
                            {user: data.user,
                                message: data.message});
               
                       
                    }
                }
            );

        });


        socket.on("disconnect", function () {
            delete clients[socket.id];
            socket.leave(socket.room);
            console.log(`${socket.id} disconnected`);
        });
    });

    // nsp.emit('hi', 'everyone!');
    // nsp.to('some room').emit('some event');

};
