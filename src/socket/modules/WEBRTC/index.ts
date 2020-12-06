import {Socket} from "socket.io";
import {  UserWEBRTC,OfferPayload, VideoToggeleData, CandidateOffer} from "../../SocketInterface";
import { Classroom } from "../../../models/classroom";

export default function webrtcSocketFactory(socket: any, io: Socket): void{
    socket.on("force_disconnect",(socketid: string) => {
        io.to(socketid).emit("force_disconnect");
    });

    socket.on("rtc_ready_state",(room: string) => {
        console.log(room);
        room && Classroom.findOne({kid: room},(error, roomFound) => {
            if(roomFound){
                socket.emit("rtc_setup_users", roomFound.participants);
            } else {
                socket.emit("rtc_search_failed");
            }
        });
    });

    socket.on("rtc_setup_users_complete",(usersToCall: [object],beepstrength: number) => {

        usersToCall.length && usersToCall.forEach((user: any) => {
            // beep users
            console.log("beeping user ",user);
            io.to(user.socketid).emit("rtc_beep",{ from: socket.id, beepstrength });
            socket.emit("beep_delivery",user);
        });
    });

    socket.on("rtc_beep_success",(target: string, mydata: any) => {
        // allow target to call me
        io.to(target).emit("rtc_beep_initite",mydata);
    });

    socket.on("mute_user_audio_webrtc", (user: UserWEBRTC) => {
        io.to(user.socketid).emit("mute_user_audio_webrtc");
    });

        
    socket.on("wave_to_user_webrtc", (data: UserWEBRTC) => {
        // console.log(data);
        io.to(data.socketid).emit("wave_to_user_webrtc_", data);
    });

    socket.on("audio_toggle_complete",(status: boolean, user: UserWEBRTC) => {
        io.in(socket.room).emit("audio_toggle_complete",status, user);
    });

    socket.on("wave_to_user_webrtc", (user: UserWEBRTC) => {
        io.to(user.socketid).emit("wave_to_user_webrtc");
    });

    socket.on("video_toggle", (data: VideoToggeleData) => {
        io.in(socket.room).emit("video_toggle", data);
    });

    socket.on("offer", (payload: OfferPayload) => {
        io.to(payload.target.socketid).emit("offer", payload);
    }); 

    socket.on("answer", (payload: OfferPayload) => {
        io.to(payload.target.socketid).emit("answer", payload);
    });

    socket.on("disconnect_user_webrtc", (user: UserWEBRTC) => {
        io.to(user.socketid).emit("disconnection_request");
    });

    socket.on("ice-candidate", (incoming: CandidateOffer) => {
        io.to(incoming.target.socketid).emit("ice-candidate", incoming);
    });

};