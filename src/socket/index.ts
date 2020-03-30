/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { chat } from "./config";
import express from "express";
import fs from "fs";
import moment from "moment";
import uuidv4 from "uuid/v4";
import sgMail  from "@sendgrid/mail";

import { Classroom, ClassroomDocument } from "../models/classroom";
import { classWeb } from "../models/classWebFiles";

import { User } from "../models/User";

export default (server: express.Application) => {
    let activeSockets: string[] = [];

    const io = require("socket.io")(server, chat);
    const clients: any[] = [];
    const nsp = io.of("/classrooms");

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
        }

        socket.on("re_join",(data: JoinObj) => {
            
            socket.user = data.userId;
            socket.room = data.classroom_id;
            socket.username = data.username;
            
            socket.join(data.classroom_id, () => {

                
                User.findOne({ _id: data.userId }).then(user => {
                    if(user && user !== null){
                        Classroom.findById(data.classroom_id, (err, res: any) => {
                           
                            const students = res.students;
                            let found = students.filter((s: any) => {
                                return String(s.id) === String(socket.user);
                            });
                            if(Array.isArray(found) && found[0]){
                                nsp.to(socket.room).emit("disconnect_user_before_join",data);
                            };
                       
                            if(res && res !== null){
                                    
                                socket.emit("rejoin_updateMsg", { by: "server",newuserslist: res.students, msgs: res.messages, type: "oldMsgUpdate" });

                                socket.emit("classroom_users", res.students);
                        
                                let oldStudentsWithoutUser = [];
                        
                                const currentClassStudents = res.students;
                                oldStudentsWithoutUser = currentClassStudents.filter((student: any[]| any) => {
                                    return String(student.id) !== String(data.userId);
                                });

                                const studentObj = {
                                    id: String(user._id),
                                    username: user.username,
                                    role: "1",

                                    stack: user.techStack,

                                    avatar: user.gravatarUrl
                                };
 
                                oldStudentsWithoutUser.push(studentObj);

                                const updatedStudentList = oldStudentsWithoutUser;
                        
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
                                        name: data.username,
                                        type: "sJoin",
                                        msgId: uuidv4(),
                                        newuserslist: updatedStudentList
                                    });
                                classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                                    if (!d && d === null) {
                                        socket.emit("classroomFilesError", "Files not found");
                                    } else {

                                        const cssfileId = d.css.id;
                                        const jsFileId = d.js.id;
                                        const htmlFileId = d.html.id;
                                        const cssContent = d.css.content;
                                        const htmlContent = d.html.content;
                                        const jsContent = d.js.content;

                                        if (!cssfileId || !jsFileId || !htmlFileId) {
                                            socket.emit("classroomFilesError", "File ID not found");
                                        }

                                        
                                        const ht = {
                                            id: htmlFileId,
                                            content: htmlContent
                                        };
                                        const cs = {
                                            id: cssfileId,
                                            content: cssContent
                                        };
                                        const js = {
                                            id: jsFileId,
                                            content: jsContent
                                        };
                                        socket.emit("class_files", cs, ht, js);

                                    }
                                });
                            }
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
            socket.userModel;
            let oldStudentsWithoutUser: any[] = [];
            // find user and update
            User.findOne({ _id: data.userId }).then(user => {
                let studentObj;

                if (user && user !== null) {

                    // check if user is already in classm, filter and push new user object
                    Classroom.findById(data.classroom_id, (err, res) => {
                        if (err) throw err;
                        
                        if (res && res !== null) {
                            const students = res.students;
                            let found = students.filter((s: any) => {
                                return String(s.id) === String(socket.user);
                            });
                            if(Array.isArray(found) && found[0]){
                                nsp.to(socket.room).emit("disconnect_user_before_join",data);
                            };
                            console.log("found class");
                            const currentClassStudents = res.students;
                            oldStudentsWithoutUser = currentClassStudents.filter(student => {
                                return String(student.id) !== String(data.userId);
                            });

                            studentObj = {
                                id: String(user._id),
                                username: user.username,
                                role: "1",

                                stack: user.techStack,

                                avatar: user.gravatarUrl,
                                socketId: socket.id
                            };
 
                            oldStudentsWithoutUser.push(studentObj);


                            const updatedStudentList = oldStudentsWithoutUser;

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

                                    socket.join(data.classroom_id, () => {

                                        nsp.to(data.classroom_id).emit("someoneJoined",
                                            {
                                                by: "server",
                                                msg: data.userId + " joined",
                                                for: data.userId,
                                                name: data.username,
                                                type: "sJoin",
                                                msgId: uuidv4(),
                                                newuserslist: updatedStudentList,
                                                socketId: socket.id
                                            });


                                        classWeb.findOne({ classroomId: data.classroom_id }).then((d: any) => {
                                            if (!d && d === null) {
                                                socket.emit("classroomFilesError", "Files not found");
                                            } else {

                                                const cssfileId = d.css.id;
                                                const jsFileId = d.js.id;
                                                const htmlFileId = d.html.id;
                                                const cssContent = d.css.content;
                                                const htmlContent = d.html.content;
                                                const jsContent = d.js.content;

                                                if (!cssfileId || !jsFileId || !htmlFileId) {
                                                    socket.emit("classroomFilesError", "File ID not found");
                                                }

                                        
                                                const ht = {
                                                    id: htmlFileId,
                                                    content: htmlContent
                                                };
                                                const cs = {
                                                    id: cssfileId,
                                                    content: cssContent
                                                };
                                                const js = {
                                                    id: jsFileId,
                                                    content: jsContent
                                                };
                                                socket.emit("class_files", cs, ht, js);

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

                    });

                }
            }).catch(err => {

                socket.emit("ErrorFetchingUser");

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
                    console.log(doc);
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
            const userNameOrEmail = user.user;
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
                                nsp.emit("invite_sent");

                            }
                                
                        });
                    } catch (e) {
                        nsp.emit("error");
                     
                    }
                       
                } else {
                    // TERMINATION
                    console.log("password reset mail exceeded trial");
                    sent = false;
                    nsp.emit("error");
                    
                }
            };
            

            User.findOne({email: userNameOrEmail},(err, user) => {
                if(err) socket.emit("error");

                if(user !== null){
                    Classroom.findOne({Kid:classroomInfo.kid}, (err, res: any) => {
                        if(res){
                            const students = res.students;
                            let found = students.filter((s: any) => {
                                return String(s.id) === String(user._id);
                            });
                            if(Array.isArray(found) && found[0]){
                                socket.emit("user_invite_failed","Already In class");
                            }else {
                                sendPasswordResetMail(user.username,user.email);
                            }
                        }
                    });
                } else if(user === null){

                    User.findOne({ username: userNameOrEmail }, (err, user) => {
                        if(err) socket.emit("error");

                        if(user !== null){
                            Classroom.findOne({Kid:classroomInfo.kid}, (err, res: any) => {
                                if(res){
                                    const students = res.students;
                                    let found = students.filter((s: any) => {
                                        return String(s.id) === String(user._id);

                                    });
                                    if(Array.isArray(found) && found[0]){
                                        socket.emit("user_invite_failed","Already In class");
                                    }else {
                                        sendPasswordResetMail(user.username,user.email);
                                    }
                                }
                            });
                        } else {
                            socket.emit("User_not_found_on_search");
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
                            return { id, role, username };
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
                            { id: id, role, assignedBy: socket.user, newusers: d.students });
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

        socket.on("leave", (data: JoinObj) => {
            // socket.leave(data.classroom_id)
            delete clients[socket.id];
            socket.leave(socket.room);

            Classroom.findById(socket.room, (err, room: ClassroomDocument) => {

                if (err) {

                } else if (room && room !== null) {
                    // find user in student field array
                    room.students.forEach((user: { id: any }, i) => {
                        if (user.id == socket.user) {
                            let newclassusers: any[];

                            newclassusers = room.students.filter((s: any, i) => {
                                return s.id != socket.user;
                            });

                            Classroom.findOneAndUpdate({ _id: socket.room }, { $inc: { numberInClass: -1 }, students: newclassusers }, { new: true }, (err, doc) => {
                                if (err) console.log("error");
                                if(socket.connected){
                                    socket.disconnect();
                                }
                                console.log(`${socket.username} disconnected`);

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

            time: Date;

            messageColor: string;
        }

        socket.on("newMessage", (data: NewMessageInterface) => {
            
            User.findOne({ _id: data.user }).then(u => {
                if (u) {
                    const msgId = uuidv4();
                    const msgObject = {
                        timeSent: moment(data.time).format("LT"),
                        msgId, name: u.username, 
                        by: data.user, 
                        msg: data.message,
                        color: data.messageColor,
                        oTime: data.time
                    };
                    Classroom.findOneAndUpdate({ Kid: data.class, status: 2 },
                        {
                            $push: {
                                messages: msgObject
                            }
                        },
                        { upsert: true },
                        function (err, doc: object) {
                            if (err) {
                                console.log(err);
                            } else {
                                //do stuff
                                nsp.emit("nM",
                                    {
                                        ...msgObject
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
            id: any;
        }

        socket.on("editorChanged", (data: EditorChangedInterface) => {
            // console.log("received signal to update editor",data);
            try {
                classWeb.findOne({classroomId:data.id}, (err,res) => {
                    if(err) socket.emit("error");
                    if(res === null) socket.emit("editor_update_error","class not found");
                    if(res !== null){
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
                            if(err) socket.emit("error");
                            if(doc) { 
                                nsp.to(socket.room).emit("class_files_updated",{...data});
                                // console.log("Class File Updated", doc);
                            }
                        });
                    }
                });

            } catch(e) {
                console.log(e);
                nsp.to(socket.room).emit("editor_update_error");
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
                    room.students.forEach((user: { id: any }, i) => {
                        if (user.id == socket.user) {
                            let newclassusers: any[];

                            newclassusers = room.students.filter((s: any, i) => {
                                return s.id != socket.user;
                            });

                            Classroom.findOneAndUpdate({ _id: socket.room }, { $inc: { numberInClass: -1 }, students: newclassusers }, { new: true }, (err, doc) => {
                                if (err) console.log("error");
                            });
                        }
                    });
                }

            });
            activeSockets = activeSockets.filter(
                existingSocket => existingSocket !== socket.id
            );
            console.log(`${socket.username}  disconnected`);
        });
    });
};
