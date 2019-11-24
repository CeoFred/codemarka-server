import {chat} from "./config";

export default  (server: any) => {
    const io = require("socket.io")(server, chat);
    const clients: any[] = [];
    let classMessage = [];
 
    const nsp = io.of("/classrooms");
 
    nsp.on("connection", function (socket: any) {
 
        console.log(`New socket connection to classroom`);
    
        // register current client  
        clients[socket.id] = socket.client;

        interface JoinObj  {
            user: string;
            classroom_id: string;
        }
        // event when someone joins a class
        socket.on("join", (data: JoinObj) => {
            
            socket.user = data.user;
            socket.room = data.classroom_id;

            socket.join(data.classroom_id,() => {
                 for (const key in socket.rooms) {
                    if (socket.rooms.hasOwnProperty(key)) {
                        const element = socket.rooms[key];
                        console.log(`${key} - ${element}`);
                    }
                }
            });  

            //send prevous message to client
            socket.emit("updateMsg","SERVER",classMessage);
            // broadcast to existing sockets that someone joined
            nsp.to(data.classroom_id).emit("someoneJoined","server",data.user+ " joined",data.user);
      
        });
  
        socket.on("leave", () => {
            // socket.leave(data.classroom_id)
            console.log("left",socket.room);

            // socket.broadcast.to(data.classroom_id).emit('left', {from:'server',msg:`someone left`});
            socket.leave(socket.room,() => {
                for (const key in socket.rooms) {
                    if (socket.rooms.hasOwnProperty(key)) {
                        const element = socket.rooms[key];
                        console.log(`${key} - ${element}`);
                    }
                }
            });
            socket.broadcast.to(socket.room).emit("updatechat_left","SERVER",socket.user + " has left this room");
      
        });
  
        
        socket.on('newMessage', data => {

          console.log(`New message - ${data.message}, in ${data.class}`);
          
          nsp.to(data.class).emit("nM", data);
       
        });


        socket.on("disconnect",function(){
            delete clients[socket.id];
            socket.leave(socket.room);
            console.log(`${socket.id} disconnected`);
        });
    });
  
    // nsp.emit('hi', 'everyone!');
    // nsp.to('some room').emit('some event');

};
