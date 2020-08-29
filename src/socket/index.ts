/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { chat } from "./config";
import fs from "fs";
import express from "express";
import moment from "moment";
import cloudinary  from "cloudinary";
import uuidv4 from "uuid/v4";
import sgMail  from "@sendgrid/mail";

import { Classroom, ClassroomDocument } from "../models/classroom";
import { ClassroomAttendance ,ClassroomAttendanceDocument} from "../models/Attendance";

import { classWeb, ClassroomWebFileDocument } from "../models/classWebFiles";

import { User, UserDocument } from "../models/User";
import { Community, CommunityDocument } from "../models/Community";
import { randomString } from "../helpers/utility";
import { result } from "lodash";

const cloudi = cloudinary.v2;

cloudi.config({ 
    cloud_name: "codemarka", 
    api_key: "831423733611478", 
    api_secret: "EsmTcI2hBcDKLRzYwxkEuxopU4o" 
});
export default (server: express.Application) => {
    let activeSockets: string[] = [];

    
    const io = require("socket.io")(server, chat);
    const clients: any[] = [];
    const nsp = io.of("/api/v1/classrooms");

    nsp.on("connection", function (socket: any) {

        const existingSocket = activeSockets.find(
            existingSocket => existingSocket === socket.id
        );
        if (!existingSocket) {
            activeSockets.push(socket.id);
        };

        console.log("New socket connection to classroom");

        // register current client  
        clients[socket.id] = socket.client;

        interface JoinObj {
            userId: string;
            classroom_id: string;
            username: string;
            cdata: ClassroomDocument;
        }

        interface ImageUploadData {
            data: string;
            by: string;
            name: string;
            time: string;
            messageColor: string;
            room: string;
        }

        socket.on("image_upload", (data: ImageUploadData) => {
            cloudi.uploader.upload(data.data, 
                function(error, result) {
                    console.log(result, error);
                    if(result){
                        socket.emit("image_upload_complete",result,data);
                     
                        function sendSocketMessage(u: any): void {

                            const msgId = uuidv4();
                            const msgObject = {
                                timeSent: moment(data.time).format("LT"),
                                msgId, 
                                name: u.username || u.communityName,
                                by: data.by,
                                color: data.messageColor,
                                oTime: data.time,
                                type:"image",
                                result
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
                                        nsp.to(socket.room).emit("nM",
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

        socket.on("start_broadcast", (roomID: string) => {
            console.log("started broadcast by host");
            Classroom.findOne({kid: roomID},(err, users) => {
                if(users && !err){
                    let usersInThisRoom = users.students.map(s =>  s.socketid).filter(o => o !== socket.id);
                    socket.emit("all_users", usersInThisRoom);
                }
            });
        });
    
        socket.on("broadcast_init",(status: boolean,userkid: string) => {
            if(status && userkid){
                Classroom.findOne({_id: socket.room},(err: Error, classroom: ClassroomDocument) => {
                    if(!err && classroom){
                        if(classroom.owner === userkid){
                            classroom.isBroadcasting = true;
                            classroom.save((err,kb) => {
                                if(kb && !err){
                                    nsp.to(socket.room).emit("broadcast_status",true,socket.id);
                                } else {
                                    nsp.to(socket.room).emit("broadcast_status",false,socket.id);
                                }
                            });
                        } else {
                            socket.emit("operation_failed","No Privilegde for User");
                        }
                    } else if (err) {
                        socket.emit("operation_failed","Something went wrong, try again later");
                    }
                });
            }
        });

        socket.on("broadcast_end",(status: boolean,userkid: string) => {
            if(status && userkid){
                Classroom.findOne({_id: socket.room},(err: Error, classroom: ClassroomDocument) => {
                    if(!err && classroom){
                        if(classroom.owner === userkid){
                            classroom.isBroadcasting = false;
                            classroom.save((err,kb) => {
                                if(kb && !err){
                                    nsp.to(socket.room).emit("broadcast_end_confirmed",true);
                                } else {
                                    nsp.to(socket.room).emit("broadcast_end_confirmed",false);
                                }
                            });
                        } else {
                            socket.emit("operation_failed","No Privilegde for User");
                        }
                    } else if (err) {
                        socket.emit("operation_failed","Something went wrong, try again later");
                    }
                });
            }
        });


        socket.on("re_join",(data: JoinObj) => {
            
            socket.user = data.userId;
            socket.room = data.classroom_id;
            socket.username = data.username;
            socket.classinfo = data.cdata;

            socket.join(data.classroom_id, () => {
                function proceedToRejoinUser(user: any){
                    
                    Classroom.findById(data.classroom_id, (err, res: any) => {
                           
                        
                       
                        if(res && res !== null){
                                    
                            socket.emit("rejoin_updateMsg", { by: "server",newuserslist: res.students, msgs: res.messages, type: "oldMsgUpdate" });

                            socket.emit("classroom_users", res.students);
                        
                            const ownerid = res.owner;
                            const isBroadcasting = res.isBroadcasting;

                            
                            let oldStudentsWithoutUser = [];
                        
                            const currentClassStudents = res.students;
                            oldStudentsWithoutUser = currentClassStudents.filter((student: any[]| any) => {
                                return String(student.kid) !== String(data.userId);
                            });

                            const studentObj = {
                                id: String(user._id),
                                username: user.username || user.communityName.toLowerCase(),
                                role: "1",
                                kid: user.kid,
                                stack: user.techStack || "communityAccount",
                                avatar: user.gravatarUrl || "communityAvatar",
                                socketid: socket.id
                            };
 
                            oldStudentsWithoutUser.push(studentObj);

                            const updatedStudentList = oldStudentsWithoutUser;
                            console.log(isBroadcasting);
                            
                            if(isBroadcasting){
                                nsp.to(data.classroom_id).emit("call_me",{id:user._id,username: user.username || user.communityName,kid:user.kid,socketid: socket.id});
                            }
                            
                            ClassroomAttendance.findOne({classroomkid: res.kid }).then((hasClassAttendance: ClassroomAttendanceDocument) => {
                                if(hasClassAttendance){
                                    // console.log("classroom has attednace document created");

                                    const classroomIsTakingAttendance = res.isTakingAttendance;
                                    const attendanceList = hasClassAttendance.list;
                                    const userHasTakenAttedance = attendanceList.some((list) => list.kid === socket.user);
                                    const isOwner = res.owner === socket.user;

                                    if(isOwner){
                                        socket.emit("attendance_list",attendanceList);
                                    }
                                    if(classroomIsTakingAttendance){
                                        // console.log("classroom is taking attedance");
                                        // check if user has taken attendance b4


                                        if(userHasTakenAttedance){
                                            // console.log("user has attendance taken");
                                            
                                            const usersAttendance = attendanceList.filter(att => att.kid === socket.user);
                                            // console.log("users attendance", usersAttendance);

                                            const numberOfUserEntries = usersAttendance.length;
                                            const lastEntry = numberOfUserEntries <= 1 ? 1 : numberOfUserEntries - 1;

                                            if(numberOfUserEntries === 1){
                                                // console.log("only one entry for current user");
                                                // check if attendance is complete
                                                const { firstName, lastName, email, gender, kid, username } = usersAttendance[0];
                                                if(!(firstName && lastName && email && gender && kid && username)){
                                                    //incomplete
                                                    setTimeout(() => socket.emit("collect_attendance", usersAttendance[0]),30000);
                                                } else {
                                                    //complete data
                                                    // console.log("user has completed attendance data");
                                                    socket.emit("has_attendance_recorded", usersAttendance[0]);
                                                }

                                            }
                                            else if(numberOfUserEntries > 1) {
                                                //resolve all atttendance and use the last entry
                                                // console.log("more than one entry,resolving..");
                                                const lastEntryData = usersAttendance[lastEntry];
                                                const attendance = attendanceList.filter(att => att.kid !== socket.user);
                                                attendance.push(lastEntryData);

                                                hasClassAttendance.list = attendance;
                                                hasClassAttendance.save((err,up) => {
                                                    if(!up && err){
                                                        console.log(err);
                                                    }
                                                });
                                            }
                                        } else {
                                            // console.log("User has not taken attendance");
                                            if(!isOwner){
                                                
                                                const userAttedance = {kid: socket.user, username: data.username, email: user.email };
                                                hasClassAttendance.list.push(userAttedance);
                                                hasClassAttendance.save((err,up) => {
                                                    if(!up && err){
                                                        console.log(err);
                                                    }
                                                });
                                                setTimeout(() => socket.emit("collect_attendance", null),30000);
                                            }
                                        }
                                    } else {
                                        // console.log("classroom is not taking attendace");
                                        if(!userHasTakenAttedance && !isOwner){
                                            const userAttedance = {kid: socket.user, username: data.username, email: user.email };
                                            hasClassAttendance.list.push(userAttedance);
                                            hasClassAttendance.save((err,up) => {
                                                if(!up && err){
                                                    console.log(err);
                                                }
                                            });
                                        }

                                    }
                                } else {
                                    console.log("No attendance document found for classroom with kid", res.kid);
                                }
                            }).catch((err) => {
                                console.log(err);
                            });
                            Classroom.findOneAndUpdate({ _id: data.classroom_id },
                                {

                                    students: updatedStudentList,
                                    $inc: { numberInClass: 1 }
                                },
                                { new: true }).then((d: any) => {});

                            nsp.to(data.classroom_id).emit("someoneJoined",
                                {
                                    by: "server",
                                    msg: data.userId + " reconnected",
                                    for: data.userId,
                                    name: data.username.toLowerCase(),
                                    type: "sJoin",
                                    msgId: uuidv4(),
                                    roomId: socket.room,
                                    newuserslist: updatedStudentList,
                                    socketid: socket.id
                                });
                            classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                                if (!d && d === null) {
                                    socket.emit("classroomFilesError", "Files not found");
                                } else {
                                    const cssfileId = d.css.id;
                                    const jsFileId = d.js.id;
                                    const htmlFileId = d.html.id;
                                    const cssContent = d.css.content;
                                    const cssExternalCDN = d.css.settings.externalCDN;
                                    const htmlContent = d.html.content;
                                    const jsContent = d.js.content;
                                    const jsExternalCDN = d.js.settings.externalCDN;
                                    console.log(cssExternalCDN,jsExternalCDN);
                                    if (!cssfileId || !jsFileId || !htmlFileId) {
                                        socket.emit("classroomFilesError", "File ID not found");
                                    }

                                        
                                    const ht = {
                                        id: htmlFileId,
                                        content: htmlContent
                                    };
                                    const cs = {
                                        id: cssfileId,
                                        content: cssContent,
                                        externalCDN: cssExternalCDN
                                    };
                                    const js = {
                                        id: jsFileId,
                                        content: jsContent,
                                        externalCDN: jsExternalCDN
                                    };
                                    socket.emit("class_files", cs, ht, js);

                                }
                            });
                        }
                    });
                }
                
                User.findOne({ kid: data.userId }).then(user => {
                    if(user){
                        return proceedToRejoinUser(user);
                    } else {
                        Community.findOne({ kid: data.userId }).then((communityAccountDocument: CommunityDocument) => {
                            if(communityAccountDocument){
                                return proceedToRejoinUser(communityAccountDocument);
                            }
                        }).catch((err) => {
                            socket.emit("error","Failed to join classroom");
                        });
                    }
                });
               
            }); 

        });
        // event when someone joins a class
        socket.on("join", (data: JoinObj) => {
            socket.user = data.userId;
            socket.room = data.classroom_id;
            socket.username = data.username;
            socket.classinfo = data.cdata;

            socket.userModel;
            let oldStudentsWithoutUser: any[] = [];
            // find user and update
            User.findOne({ kid: data.userId }).then(user => {
                let studentObj;
                function proceedTojoinUser(user: any){
                    // check if user is already in classm, filter and push new user object
                    Classroom.findById(data.classroom_id, (err, res) => {
                        if (err) throw err;
                        
                        if (res && res !== null) {
                            const ownerid = res.owner;
                            const isBroadcasting = res.isBroadcasting;
                            console.log(isBroadcasting);
                            
                            if(isBroadcasting){
                                nsp.to(socket.room).emit("call_me",{id:user._id,username: user.username || user.communityName,kid:user.kid,socketid: socket.id});
                            }
                            const students = res.students;
                            let found = students.filter((s: any) => {
                                return String(s.id) === String(socket.user);
                            });
                            if(Array.isArray(found) && found[0]){
                                nsp.to(socket.room).emit("disconnect_user_before_join",data);
                            };
                            // console.log("found class");
                            const currentClassStudents = res.students;
                            oldStudentsWithoutUser = currentClassStudents.filter(student => {
                                return String(student.kid) !== String(data.userId);
                            });

                            studentObj = {
                                id: String(user._id),
                                username: user.username || user.communityName.toLowerCase(),
                                role: "1",
                                kid: user.kid,
                                stack: user.techStack || "communityAccount",
                                avatar: user.gravatarUrl || user.Logo,
                                socketid: socket.id
                            };
 
                            oldStudentsWithoutUser.push(studentObj);


                            const updatedStudentList = oldStudentsWithoutUser;
                            // console.log(updatedStudentList);
                            Classroom.findOneAndUpdate({ _id: data.classroom_id },
                                {

                                    students: updatedStudentList,
                                    $inc: { numberInClass: 1 }
                                },
                                { new: true }).then((d: any) => {

                                if (d) {
                                    const classroom = socket.room;

                                    Classroom.findById(classroom, (err, res) => {
                                        if (err) console.log(err);
                                        let ratings = res.ratings;
                                        let foundRating = ratings.filter(rating => {
                                            return String(socket.user) === String(rating.user);
                                        });

                                        if (foundRating && Array.isArray(foundRating) && foundRating.length > 0) {
                                            return socket.emit("rated_class", true);
                                        } else {
                                            return socket.emit("rated_class", false);

                                        }

                                    });
                                    socket.emit("updateMsg", { by: "server", msgs: d.messages, type: "oldMsgUpdate" });

                                    socket.emit("classroom_users", d.students);
                                    
                                    socket.emit("class_favourites", d.likes);
                                  

                            
                                    ClassroomAttendance.findOne({classroomkid: res.kid }).then((hasClassAttendance: ClassroomAttendanceDocument) => {
                                        if(hasClassAttendance){
                                            // console.log("classroom has attednace document created");

                                            const classroomIsTakingAttendance = res.isTakingAttendance;
                                            const attendanceList = hasClassAttendance.list;
                                            const userHasTakenAttedance = attendanceList.some((list) => list.kid === socket.user);
                                            const isOwner = res.owner === socket.user;

                                            if(classroomIsTakingAttendance){
                                                // console.log("classroom is taking attedance");
                                                // check if user has taken attendance b4

                                                if(res.owner === socket.user){
                                                    socket.emit("attendance_list",attendanceList);
                                                }
                                                if(userHasTakenAttedance){
                                                    // console.log("user has attendance taken");
                                                    
                                                    const usersAttendance = attendanceList.filter(att => att.kid === socket.user);
                                                    // console.log("users attendance", usersAttendance);

                                                    const numberOfUserEntries = usersAttendance.length;
                                                    const lastEntry = numberOfUserEntries <= 1 ? 1 : numberOfUserEntries - 1;

                                                    if(numberOfUserEntries === 1){
                                                        // console.log("only one entry for current user");
                                                        // check if attendance is complete
                                                        const { firstName, lastName, email, gender, kid, username } = usersAttendance[0];
                                                        if(!(firstName && lastName && email && gender && kid && username)){
                                                            //incomplete
                                                            setTimeout(() => socket.emit("collect_attendance", usersAttendance[0]),30000);
                                                        } else {
                                                            //complete data
                                                            console.log("user has completed attendance data");
                                                            socket.emit("has_attendance_recorded", usersAttendance[0]);
                                                        }

                                                    }
                                                    else if(numberOfUserEntries > 1) {
                                                        //resolve all atttendance and use the last entry
                                                        console.log("more than one entry,resolving..");
                                                        const lastEntryData = usersAttendance[lastEntry];
                                                        const attendance = attendanceList.filter(att => att.kid !== socket.user);
                                                        attendance.push(lastEntryData);

                                                        hasClassAttendance.list = attendance;
                                                        hasClassAttendance.save((err,up) => {
                                                            if(!up && err){
                                                                console.log(err);
                                                            }
                                                        });
                                                    }
                                                } else {
                                                    // console.log("User has not taken attendance");
                                                    if(!isOwner){
                                                        
                                                        const userAttedance = {kid: socket.user, username: data.username, email: user.email };
                                                        hasClassAttendance.list.push(userAttedance);
                                                        hasClassAttendance.save((err,up) => {
                                                            if(!up && err){
                                                                console.log(err);
                                                            }});
                                                        setTimeout(() => socket.emit("collect_attendance", null),30000);
                                                    }
                                                }
                                            } else {
                                                console.log("classroom is not taking attendace");
                                                if(!userHasTakenAttedance && !isOwner){
                                                    const userAttedance = {kid: socket.user, username: data.username, email: user.email };
                                                    hasClassAttendance.list.push(userAttedance);
                                                    hasClassAttendance.save((err,up) => {
                                                        if(!up && err){
                                                            console.log(err);
                                                        }
                                                    });
                                                }

                                            }
                                        } else {
                                            console.log("No attendance document found for classroom with kid", res.kid);
                                        }
                                    }).catch((err) => {
                                        console.log(err);
                                    });

                                    socket.join(data.classroom_id, () => {

                                        nsp.to(data.classroom_id).emit("someoneJoined",
                                            {
                                                by: "server",
                                                msg: data.userId + " joined",
                                                for: data.userId,
                                                name: data.username.toLowerCase(),
                                                type: "sJoin",
                                                msgId: uuidv4(),
                                                newuserslist: updatedStudentList,
                                                socketid: socket.id
                                            });


                                        classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                                            if (!d && d === null) {
                                                socket.emit("classroomFilesError", "Files not found");
                                            } else {

                                                const cssfileId = d.css.id;
                                                const jsFileId = d.js.id;
                                                const htmlFileId = d.html.id;
                                                const cssContent = d.css.content;
                                                const cssExternalCDN = d.css.settings.externalCDN;
                                                const htmlContent = d.html.content;
                                                const jsContent = d.js.content;
                                                const jsExternalCDN = d.js.settings.externalCDN;
                                                console.log(cssExternalCDN,jsExternalCDN);
                                                if (!cssfileId || !jsFileId || !htmlFileId) {
                                                    socket.emit("classroomFilesError", "File ID not found");
                                                }
            
                                                    
                                                const ht = {
                                                    id: htmlFileId,
                                                    content: htmlContent
                                                };
                                                const cs = {
                                                    id: cssfileId,
                                                    content: cssContent,
                                                    externalCDN: cssExternalCDN
                                                };
                                                const js = {
                                                    id: jsFileId,
                                                    content: jsContent,
                                                    externalCDN: jsExternalCDN
                                                };
                                                socket.emit("class_files", cs, ht, js);

                                            }
                                        });
                                    });
                                } else {
                                    socket.emit("classroomError", null);
                                }
                            }).catch(e => {
                                console.log(e);
                            });
                        }

                    });

                }
                if (user) {
                    proceedTojoinUser(user);

                } else {
                    Community.findOne({ kid: data.userId }).then((communityAccountDocument: CommunityDocument) => {
                        if(communityAccountDocument){
                            return proceedTojoinUser(communityAccountDocument);
                        }
                    }).catch((err) => {
                        socket.emit("error","Failed to join classroom");
                    });
                }
            }).catch(err => {

                socket.emit("ErrorFetchingUser");

            });

        });

        socket.on("new_attendance_record", (data: any) => {
            const classroomkid = socket.classinfo.kid;

            ClassroomAttendance.findOne({ classroomkid},(err, attendance) => {{

                if(attendance){

                    const list = attendance.list;
                    const hasTakenAttendance = list.some(user => user.kid === socket.user);
                    // console.log(data);
                    if (hasTakenAttendance){
                        // old Record, update.
                        attendance.list = list.map(user => {
                            if(user.kid === socket.user){
                                return { ...data, username: socket.username, kid: socket.user};
                            } else {
                                return user;
                            }
                        });
                    } else {
                        // new record
                        attendance.list.push({ ...data, username: socket.username, kid: socket.user});
                    }
                    attendance.save((err, recorded) => {
                        if (recorded) {
                            // console.log(recorded);
                            socket.emit("attendance_recorded", recorded.list.filter(u => u.kid === socket.user)[0]);
                            nsp.to(socket.room).emit("new_attendance",recorded.list);
                        }
                    });
                }
            }});

        });

        socket.on("send_attendance_reminder_init",() => {
            nsp.to(socket.room).emit("attendance_reminder");
        });

        socket.on("download_attendance_init",(classroomkid: string) => {
            ClassroomAttendance.findOne({ classroomkid},(err,res) => {
                if(!err && res){
                    // create csv file
                    const classroomDir = __dirname + "/../../main/classrooms/" + classroomkid;

                    if(!fs.existsSync(classroomDir)){
                        fs.mkdirSync(classroomDir);
                    } else {
                        const files = fs.readdirSync(classroomDir,{withFileTypes:true});
                        // console.log(files);
                        files.forEach(element => {
                            let ext = element.name.split(".")[1];
                            if(ext === "csv"){
                                fs.unlinkSync(classroomDir + "/" + element.name);
                            }
                        });
                    }
                    const fileName = randomString(100);
                    fs.appendFileSync(classroomDir + "/"+ fileName + ".csv","firstName,lastName,classExpertiseLevel,gender,email,phone,username \n");

                    let content = "";
                    let l = res.list;
                    l.forEach(user => {
                        delete user._id;
                        delete user.kid;
                        content+= `${user.firstName},${user.lastName},${user.classExpertiseLevel},${user.gender},${user.email},${user.phone || ""},${user.username} \n`;
                    });
                    fs.appendFileSync(classroomDir + "/"+ fileName + ".csv",content);

                    res.csvName = fileName;

                    res.save((err,de) => {
                        if(de && !err){
                            socket.emit("attedance_ready",de.csvName,res.list);
                        }
                    });
                }
            });
        });

        socket.on("start_class",(userid: string) => {
            Classroom.findOneAndUpdate({ _id: socket.room, owner: userid },{
                status:2
            },{new: true},(err, doc) => {
                if(!err){
                    socket.emit("started_class");
                }
            });
        });

        socket.on("shutdown_classroom",() => {
            nsp.to(socket.room).emit("shut_down_emitted",{by:socket.user});

            
            Classroom.findOneAndUpdate({_id: socket.room},{
                status:3

            },{new: true},(err, doc) => {

                if(!err){
                    //emit socket to namespace
                    // console.log(doc);
                    setTimeout(() => {
                        nsp.to(socket.room).emit("shut_down_now");
                        
                    }, 7000);
                }

            });

        });

        socket.on("block_user",(user: any) => {
            const classroom = socket.room;
            const userToBlock =  user.id;

            // find classroom of user
            Classroom.findById(classroom, (err, res) => {
                
                if(err) {
                    console.log(err);
                }

                if(res && res !== null) {
                    
                    // All students in a class
                    const students = res.students;

                    const studentSearch = students.filter(student => {
    
                        return String(student.id) === String(userToBlock);
                         
                    });

                    const isBlocked = res.blocked.filter(blockedStudent => {
                        return blockedStudent.user.id === String(userToBlock);
                    });

                    if(isBlocked && isBlocked.length > 0 && Array.isArray(isBlocked)){
                        socket.emit("blocking_user_failed",{user,reason:"User is already blocked"});
                        // return;
                    };

                    let studentInClass = undefined;
                    let newStudentsInClassArray;

                    if(studentSearch && Array.isArray(studentSearch) && studentSearch.length > 0){
                        studentInClass = true;
                    } else {
                        studentInClass = false;
                    }



                    if(studentInClass){
                    // remove user from classroom table as a student

                        newStudentsInClassArray = students.filter((student) => {
                            return String(student.id) !== String(userToBlock);
                        });
                    } else {
                        socket.emit("blocking_user_failed",{user,reason:"User is not a student in class"});
                        return true;
                    }


                    Classroom.findOneAndUpdate({_id: classroom},{
                        $push : {
                            blocked : { user,by: socket.user, at: moment.now() }
                        },
                        students: newStudentsInClassArray,
                    },{new: true},(err, doc) => {

                        if(!err){
                            //emit socket to namespace
                            console.log(doc);
                            nsp.to(socket.room).emit("blocking_user_success",{user,by: socket.user,newStudents: doc.students});
                        }

                    });


                }

            });


        });

        socket.on("add_to_favourite", () => {
            try {
                Classroom.findById(socket.room, (err, res) => {
                    if (err) {
                        console.log(err);
                    };

                    if (res && res !== null) {
                        let classFavourites = res.likes;
                        let newclassfavourites;
                        let hasLiked = false;

                        classFavourites.forEach(user => {

                            if (String(user.id) === String(socket.user)) {
                                hasLiked = true;
                            }
                        });

                        if (hasLiked) {
                            //remove user to favourite
                            newclassfavourites = classFavourites.filter(user => {
                                return String(user.id) !== String(socket.user);
                            });


                        } else {
                            //add user to has favourite
                            newclassfavourites = classFavourites;
                            newclassfavourites.push({ "id": socket.user, time: moment.now() });

                        }

                        Classroom.findOneAndUpdate({ _id: socket.room, status: 2 },
                            {

                                likes: newclassfavourites,
                            },
                            { new: true }).then((d: any) => {
                      
                            nsp.to(socket.room).emit("new_favourite_action",
                                { liked: hasLiked ? false : true, user: socket.user });
                        });

                    }
                });
            } catch (e) {

            }

        });

        socket.on("star_rating", (rating: number) => {
            const classroom = socket.room;

            Classroom.findById(classroom, (err, res) => {
                if (err) console.log(err);
                let ratings = res.ratings;
                let foundRating = ratings.filter(rating => {
                    return String(socket.user) === String(rating.user);
                });

                if (foundRating && Array.isArray(foundRating) && foundRating.length > 0) {
                    socket.emit("star_rating_failed", "Already Rated this class");
                } else {

                    Classroom.findOneAndUpdate({ _id: classroom }, {
                        $push: {
                            ratings: { "id": uuidv4(), "rating": rating, user: socket.user }
                        }
                    },
                    { new: true },
                    (err, doc) => {
                        if (err) console.log(err);
                  
                        socket.emit("star_rating_added", socket.user);
                    }
                    );
                }

            });

            
        });

        socket.on("invite_user", (user: any) => {
            const email = String(user.user).toLowerCase();
            const classroomInfo = user.classData;
            let trial = 0;
            let maxTrial = 2;
            let sent = false;
            const sendPasswordResetMail = (username: string, email: string) => {

                const joinLink = `https://codemarka.dev/c/classroom/${classroomInfo.kid}`;
                const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <div style="text-align:center">
                    </div>
                    <h4><b>Hi ${username},</b></h4>
                    <p>You've been invited by ${classroomInfo.username} to join a classroom session on codemarka, more details about this classroom 
                    below. </p>
                    <div>
                    <p>Classroom Name - ${classroomInfo.name}</p>
                    <p>Classroom Topic - ${classroomInfo.topic}</p>
                    <p>Classroom Description - ${classroomInfo.description}</p>
                    <p>Short Url - ${classroomInfo.shortUrl}</p>

                    </div>
                    <button type='button' style="
                        display: inline-block;
    font-weight: 600;
    text-align: center;
    vertical-align: middle;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    background-color: transparent;
    border: 1px solid transparent;
    padding: .75rem 1.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border-radius: .375rem;
    transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
    color: #fff;
    background-color: #2dca8c;
    border-color: #2dca8c;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.15);
"><a href='${joinLink}'>Join</a></button>
                    <br/>
                    copy link below to your browser if button above does not work on your device.
                    ${joinLink}

                    <br/>

                    </div>

                    `;

                sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                const msg = {
                    to: email,
                    from: "no-reply@codemarak.dev",
                    subject: "Classroom Invitation",
                    text: `Click to join ${joinLink}`,
                    html: emailTemplate,
                };

                if(trial <= maxTrial && !sent){
                    try {
                        sgMail.send(msg,true,(err: any,resp: unknown) => {

                            if(err){
                                // RECURSION
                                trial++;
                                console.log("retrying..",trial);
                                sent = false;
                                sendPasswordResetMail(username,email);
                            } else {
                                
                                // BASE
                                console.log("sent mail to",email);
                                sent = true;
                                nsp.to(socket.room).emit("invite_sent");

                            }
                                
                        });
                    } catch (e) {
                        console.log(e);
                        nsp.to(socket.room).emit("error");
                     
                    }
                       
                } else {
                    // TERMINATION
                    sent = false;
                    nsp.to(socket.room).emit("user_invite_failed","Failed to send invitation,try again!");
                    
                }
            };
            

            User.findOne({email: email.toLowerCase()},(err, user) => {
                if(err) socket.emit("user_invite_failed","Something went Wrong,try again.");

                if(user){
                    Classroom.findOne({kid:classroomInfo.kid}, (err, res: any) => {
                        if(res){
                            const students = res.students;
                            let found = students.filter((s: any) => {
                                return String(s.kid) === String(user.kid);
                            });
                            if(Array.isArray(found) && found[0]){
                                socket.emit("user_invite_failed","User already In class");
                            }else {
                                sendPasswordResetMail(user.username.toLowerCase(),user.email);
                            }
                        } else {
                            socket.emit("user_invite_failed",`Classroom Not Found with id ${classroomInfo.kid}`);
                            
                        }
                    });
                } else if(user === null){

                    Community.findOne({ email: email.toLowerCase() }, (err, user) => {

                        if (err) socket.emit("user_invite_failed","Something went wrong,try again.");

                        if (user) {
                            Classroom.findOne({ kid: classroomInfo.kid }, (err, res: any) => {
                                if (res) {
                                    const students = res.students;
                                    let found = students.filter((s: any) => {
                                        return String(s.kid) === String(user.kid);
                                    });
                                    if (Array.isArray(found) && found[0]) {
                                        socket.emit("user_invite_failed", "User already In class");
                                    } else {
                                        sendPasswordResetMail(user.communityName, user.email);
                                    }
                                } else if(!res && !err){
                                    socket.emit("user_invite_failed",`Classroom Not Found with id ${classroomInfo.kid}`);
                                }
                            });
                        } else {
                            socket.emit("user_invite_failed", "Whoops! User not found");
                        }
                    });


                }
                
            });
        });

        socket.on("new_pinned_message", (msg: string) => {

            const classroom = socket.room;
            Classroom.findOneAndUpdate({ _id: classroom }, {
                $push: {
                    pinnedMessages: { "id": uuidv4(), "content": msg }
                }
            },
            { new: true },
            (err, doc) => {
                if (err) console.log(err);
                nsp.to(classroom).emit("pinned_message_added", doc.pinnedMessages);
            }
            );
        });

        socket.on("user_waving", (user: any) => {
            nsp.to(socket.room).emit("user_waved", { from: socket.username, to: user });
        });

        socket.on("toogle_class_role", (data: any) => {
            const username = data.user.username;
            const id = data.user.id;
            const role = data.new_role;
            let newadminkid: string;
            // query classroom classroom and update 
            // console.log(`Incoming role toogle data ${data}`);

            Classroom.findById(socket.room, (err, data) => {
                if (err) console.log(err);

                if (data) {

                    // All students in a class
                    const students = data.students;

                    const newStudentsList = students.map(student => {

                        if (String(student.id) === String(id)) {
                            // console.log(`fOUND STUDENT AND UPDATING CLASS ROLE TO ${role}`)
                            newadminkid = student.kid;
                            return { ...student,role };
                        } else {
                            // console.log(`Found student not to be updaed = ${student}`);
                            return student;
                        }
                    });
                    // console.log(`Updated student role`, newStudentsList);

                    let subAdmins = data.subAdmins;

                    let newSubAdmins;

                    // console.log(`old sub Admin ${subAdmins}`);

                    let foundSubAdminIndex;

                    // search if user to assign role is a sub Admin
                    foundSubAdminIndex = subAdmins.filter((admin: { id: any }, i) => {
                        return String(admin.id) === String(id);
                    });


                    if (Array.isArray(foundSubAdminIndex) && foundSubAdminIndex.length > 0) {
                        // was a sub Admin, update role
                        newSubAdmins = subAdmins.map((admin: { id: string }) => {
                            if (admin.id === String(id)) {
                                return { id: String(id), role, assignedBy: socket.user };
                            } else {
                                return admin;
                            }
                        });
                    } else {
                        // was not a sub Admin, add user as sub Admin and assign role
                        subAdmins.push({ id: String(id), role, assignedBy: socket.user });
                        newSubAdmins = subAdmins;

                    }

                    Classroom.findOneAndUpdate({ _id: socket.room, status: 2 },
                        {

                            students: newStudentsList,
                            subAdmins: newSubAdmins
                        },
                        { new: true }).then((d: any) => {

                        nsp.to(socket.room).emit("newuser_role",
                            {kid:newadminkid, id: id, role, assignedBy: socket.user, newusers: d.students });
                    });

                }
            });


        });

        socket.on("classInformationUpdate", (data: any) => {

            const classid = socket.room;
            const topic = data.ctopic.value;
            const description = data.cdesc.value;
            const name = data.cname.value;

            Classroom.findOneAndUpdate({ _id: classid }, {
                name,
                description,
                topic,
            }, { new: true }, (err, doc) => {
                if (err) socket.emit("errUpdating", err);
                if(doc) {
                    nsp.to(socket.room).emit("newClassInformation", doc);
                    console.log("classroom_Information Updated Successfully!");
                }
                
            });
        });

        interface NewMessageInterface {
            message: string;
            class: string;
            user: string;

            time: Date;
            kid: string;
            messageColor: string;
        }

        socket.on("newMessage", (data: NewMessageInterface) => {
            function sendSocketMessage(u: any): void {

                const msgId = uuidv4();
                const msgObject = {
                    timeSent: moment(data.time).format("LT"),
                    msgId, 
                    name: u.username || u.communityName,
                    by: data.user,
                    msg: data.message,
                    color: data.messageColor,
                    oTime: data.time,
                    type:"text"
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
                            nsp.to(socket.room).emit("nM",
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

        interface EditorChangedInterface {
            class: string;
            user: string;
            content: string;
            file: string;
            id: any;
            kid: string;
        }

        socket.on("editorChanged", (data: EditorChangedInterface) => {
            try {
                classWeb.findOne({classroomKid:data.kid}, (err,res) => {

                    if(err) {
                        socket.emit("classroom_error");
                        console.log(err);
                    };
                    if(res === null) {
                        socket.emit("editor_update_error","class not found");
                        console.log("class not found",res);
                    }
                    if(res){
                        if(data.file === "js"){
                            res.js.content = data.content;
                        }
                        if(data.file === "css"){
                            res.css.content = data.content;
                        }
                        if(data.file === "html"){
                            res.html.content = data.content;
                        }
                        res.save((err,doc) => {
                            if(err) {
                                socket.emit("classroom_error");
                                console.log("Error updating editors remotely",err);
                            }
                            if(doc) { 
                                nsp.to(socket.room).emit("class_files_updated",{...data});
                                // console.log("Class File Updated", doc);
                            }
                        });
                    }
                });

            } catch(e) {
                console.log(e);
                nsp.to(socket.room).emit("editor_update_error","Failed to Update On Remote Server");
            } 
            
            // console.log(classfiles);

            

        });

        socket.on("user_typing", (data: any): void => {
            nsp.to(socket.room).emit("utyping", {
                ...data
            });
        });

        socket.on("user_typing_cleared", (data: any): void => {
            nsp.to(socket.room).emit("utyping_cleared", {
                ...data
            });
        });
        interface EditorSettingsData {
            classroom: string;
            preprocessor: any;
            externalCDN: any[];
            editor: string;
        }

        socket.on("editor_settings_changed", (EditorSettingsData: EditorSettingsData):  void => {
            const { preprocessor, externalCDN} = EditorSettingsData;

            // function hasKey<O>(obj: O, key: keyof any): key is keyof O {
            //     return key in obj;
            // };
            // update settings
            classWeb.findOne({classroomKid: EditorSettingsData.classroom},(err: Error, classWebDoc: ClassroomWebFileDocument) => {
                const editorName  = EditorSettingsData.editor;

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

        socket.on("disconnect", function () {
          

            nsp.to(socket.room).emit("updatechat_left", {
                by: "server",
                msg: socket.username + " left",
                for: socket.user,
                name: socket.username,
                type: "sLeft",
                timeSent: moment().format("LT"),
                msgId: uuidv4(),
                roomId: socket.room
            });
            Classroom.findById(socket.room, (err, room: ClassroomDocument) => {

                if (err) {

                } else if (room && room !== null) {
                    // find user in student field array
                    room.students.forEach((user: { kid: string }, i) => {
                        if (user.kid == socket.user) {
                            let newclassusers: any[];

                            newclassusers = room.students.filter((s: any, i) => {
                                return s.kid != socket.user;
                            });

                            Classroom.findOneAndUpdate({ _id: socket.room }, {  numberInClass: newclassusers.length , students: newclassusers }, { new: true }, (err, doc) => {
                                if (err) console.log("error");
                                delete clients[socket.id];
                                socket.leave(socket.room);
                                activeSockets = activeSockets.filter(
                                    (existingSocket) =>
                                        existingSocket !== socket.id
                                );
                                       
                            });
                        }
                    });
                }

            });

            console.log(`${socket.username}  disconnected`);
        });
    });
};
