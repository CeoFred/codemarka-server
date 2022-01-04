import { chat } from "./config";
import express from "express";

import VideoConferencingEvents from "./modules/WEBRTC/index";
import ChatEvents from "./modules/LiveChat/index";
import EditorEvents from "./modules/Editor/index";
import GeneralEvents from "./modules/General/index";
export default (server: express.Application) => {
    let activeSockets: string[] = [];

    
    const io = require("socket.io")(server, chat);
    const clients: object[] = [];
    const usersonline: any = {} ;

    io.on("connection", function (socket: any) {
        const existingSocket = activeSockets.find((existingSocket: any) => {
            return existingSocket.id === socket.id;
        });
        if (!existingSocket) {
            activeSockets.push(socket);
        };
        // register current client  
        clients[socket.id] = socket.client;
        usersonline[socket.id] = { socket, kid: null, inRoom: false, room: null};
        
        VideoConferencingEvents(socket,io);
        ChatEvents(socket,io);
        EditorEvents(socket,io);
        GeneralEvents(socket,io, usersonline,activeSockets,clients);

    });
};
