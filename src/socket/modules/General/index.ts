/* eslint-disable @typescript-eslint/no-unused-vars */
import { Socket }  from "socket.io";
import moment from "moment";
import uuidv4 from "uuid/v4";
import sgMail  from "@sendgrid/mail";
import fs from "fs";

import {Classroom, ClassroomDocument} from "../../../models/classroom";
import {User} from "../../../models/User";
import {ClassroomAttendance, ClassroomAttendanceDocument} from "../../../models/Attendance";
import {classWeb} from "../../../models/classWebFiles";
import { Community, CommunityDocument} from "../../../models/Community";

import { randomString} from "../../../helpers/utility";
import { JoinObj } from "../../SocketInterface";
import cloudi from "../../../config/cloudinary";
export default function GeneralSocketEvent(socket: Socket | any, io: Socket, usersonline: any,activeSockets: any,clients: any[]): void{

    socket.on("join_preview_room",(room: string) => {
        socket.join(`preview--${room}`,() => {
            socket.emit("preview_connected");
        });
    });

    
    socket.on("gravatarRegenerate",(data: any) => {
        Classroom.findOne({kid: data.room }).then(room => {
            if(room){
                room.regenerate();
                room.actions.push({message: "Gravatar Updated",user: socket.user,timestamp: data.time });
                room.save((err, data) => {
                    if(err) io.in(socket.room).emit("action_failed","Failed to Generate Gravatr");
                    io.in(socket.room).emit("gravatar_image_upload_complete",data.gravatarUrl);
                });
            } else {
                io.in(socket.room).emit("action_failed","Classroom not found");
            }
        }).catch(() => {
            io.in(socket.room).emit("action_failed","Something went wrong");
        });
    });

    socket.on("gravatar_image_upload",(data: any) => {
        cloudi.uploader.upload(data.data, 
            function(error: any, result: any) {
                if(result && !error){
                    Classroom.findOneAndUpdate({ kid: data.room, status: 2 },
                        {
                            $push: {
                                actions: {message:"Updated Gravatr image", user: socket.user, timestamp: data.time}
                            },
                            gravatarUrl: result.secure_url
                        },
                        { upsert: true },
                        function (err, doc: object) {
                            if (err) {
                                console.log(err);
                            } else if (doc) {
                                socket.emit("gravatar_image_upload_complete",result.secure_url);
                            }
                        }
                    );
                }
            });
    });


    // event when someone joins a class
    socket.on("join", (data: JoinObj): void => {
        socket.user = data.userId;
        socket.room = data.classroom_id;
        socket.username = data.username;
        socket.classinfo = data.cdata;

        socket.userModel;
        let oldStudentsWithoutUser: any[] = [];
        // find user and update
        User.findOne({ kid: data.userId }).then(user => {
            let studentObj;
            function proceedTojoinUser(user: any): void{
                // check if user is already in classm, filter and push new user object
                Classroom.findById(data.classroom_id, (err, res) => {
                    if (err) throw err;
                        
                    if (res && res !== null) {
                        const isBroadcasting = res.isBroadcasting;
                            
                        if(isBroadcasting){
                            io.in(socket.room).emit("call_me",{id:user._id,username: user.username || user.communityName,kid:user.kid,socketid: socket.id});
                        }
                        const students = res.students;
                        let found = students.filter((s: any) => {
                            return String(s.id) === String(socket.user);
                        });
                        if(Array.isArray(found) && found[0]){
                            io.in(socket.room).emit("disconnect_user_before_join",data);
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
                                // console.log(d.students);
                                    
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
                                socket.join(`preview--${res.kid}`);

                                socket.join(data.classroom_id, () => {
                                        
                                    usersonline[socket.id].room = data.classroom_id;
                                    usersonline[socket.id].inRoom = true;
                                    usersonline[socket.id].kid = data.userId;
                                    // console.log(usersonline[socket.id]);
                                    console.log(Object.keys(usersonline).length, " sockets active");

                                    socket.to(data.classroom_id).emit("someoneJoined",
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
                        io.in(socket.room).emit("new_attendance",recorded.list);
                    }
                });
            }
        }});

    });

    socket.on("send_attendance_reminder_init",() => {
        io.in(socket.room).emit("attendance_reminder");
    });

    socket.on("download_attendance_init",(classroomkid: string) => {
        ClassroomAttendance.findOne({ classroomkid},(err,res) => {
            if(!err && res){
                // create csv file
                const classroomDir = __dirname + "/../../main/classrooms/" + classroomkid;

                if(!fs.existsSync(classroomDir)){
                    try {
                        fs.mkdirSync(classroomDir,{ recursive: true });               
                    } catch (error) {
                        console.log(error);
                    }
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
                fs.appendFileSync(classroomDir + "/"+ fileName + ".csv","id,firstName,lastName,classExpertiseLevel,gender,email,phone,username \n");

                let content = "";
                let l = res.list;
                l.forEach((user,index) => {
                    delete user._id;
                    delete user.kid;
                    content+= `${index+1},${user.firstName || ""},${user.lastName || ""},${user.classExpertiseLevel || ""},${user.gender || ""},${user.email || ""},${user.phone || ""},${user.username} \n`;
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
        io.in(socket.room).emit("shut_down_emitted",{by:socket.user});

            
        Classroom.findOneAndUpdate({_id: socket.room},{
            status:3

        },{new: true},(err, doc) => {

            if(!err){
                //emit socket to namespace
                // console.log(doc);
                setTimeout(() => {
                    io.in(socket.room).emit("shut_down_now");
                        
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
                        io.in(socket.room).emit("blocking_user_success",{user,by: socket.user,newStudents: doc.students});
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
                      
                        io.in(socket.room).emit("new_favourite_action",
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

    socket.on("invite_user", (user: any): void => {
        const email = String(user.user).toLowerCase();
        const classroomInfo = user.classData;
        let trial = 0;
        let maxTrial = 2;
        let sent = false;
        const sendPasswordResetMail = (username: string, email: string): void => {

            const joinLink = `https://codemarka.dev/c/classroom/${classroomInfo.kid}`;
            const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <div style="text-align:center">
                    </div>
                    <h4><b>Hey there,</b></h4>
                    <p>You've been invited by ${classroomInfo.username} to join a session on codemarka, join
                    below. </p>
 ${joinLink}
                    <div>
                    <p> Name - ${classroomInfo.name}</p>
                    <p> Topic - ${classroomInfo.topic}</p>
                    <p> Description - ${classroomInfo.description}</p>
                    </div>
                    </div>

                    `;

            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            const msg = {
                to: email,
                from: `${classroomInfo.username}@codemarka.dev`,
                subject: "Classroom Invitation On Codemarka",
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
                            io.in(socket.room).emit("invite_sent");

                        }
                                
                    });
                } catch (e) {
                    console.log(e);
                    io.in(socket.room).emit("error");
                     
                }
                       
            } else {
                // TERMINATION
                sent = false;
                io.in(socket.room).emit("user_invite_failed","Failed to send invitation,try again!");
                    
            }
        };
            

        User.findOne({ $or:[ {"username":email}, {"email":email} ]},(err, user) => {
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
            } else {
                function ValidateEmail(mail: string): void
                {
                    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
                    {
                        sendPasswordResetMail("",mail);
                    }
                }
                ValidateEmail(email);

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
            io.in(classroom).emit("pinned_message_added", doc.pinnedMessages);
        }
        );
    });

    socket.on("user_waving", (user: any) => {
        io.in(socket.room).emit("user_waved", { from: socket.username, to: user });
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

                    io.in(socket.room).emit("newuser_role",
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
        const schedule = data.cschedule.value;

        Classroom.findOneAndUpdate({ _id: classid }, {
            name,
            description,
            topic,
            schedule
        }, { new: true }, (err, doc) => {
            if (err) socket.emit("errUpdating", err);
            if(doc) {
                io.in(socket.room).emit("newClassInformation", doc);
                console.log("classroom_Information Updated Successfully!");
            }
                
        });
    });  

        

    socket.on("disconnect", function () {
        Classroom.findById(socket.room, (err, room: ClassroomDocument) => {
            if (err) {
            } else if (room && room !== null) {
                room.students.forEach((user: { kid: string }, i) => {
                    if (user.kid === socket.user) {
                        let newclassusers: any[];
                        newclassusers = room.students.filter((s: any, i) => {
                            return s.kid != socket.user;
                        });
                        Classroom.findOneAndUpdate({ _id: socket.room }, {  numberInClass: newclassusers.length , students: newclassusers }, { new: true }, (err, doc) => {
                            if (err) console.log("error");
                            delete clients[socket.id];
                            delete usersonline[socket.id];
                            console.log(`${socket.username}  disconnected from ${room.name}`);
                            io.in(socket.room).emit("updatechat_left", {
                                by: "server",
                                msg: socket.username + " left",
                                for: socket.user,
                                name: socket.username,
                                type: "sLeft",
                                timeSent: moment().format("LT"),
                                msgId: uuidv4(),
                                roomId: socket.room
                            });
                            activeSockets = activeSockets.filter(
                                (existingSocket: any) =>
                                    existingSocket !== socket.id
                            );
                            console.log(Object.keys(usersonline).length, " sockets active");
                        });
                    }
                });
            }
        });
    });
}