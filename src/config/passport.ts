/* eslint-disable @typescript-eslint/no-unused-vars */
import google from "passport-google-oauth";
import github from "passport-github";
import local from "passport-local";

import _ from "lodash";

import passport from "passport";
import sgMail  from "@sendgrid/mail";

import {User} from "../models/User";
import {Community} from "../models/Community";
import { randomString } from "../helpers/utility";

const { OAuth2Strategy: GoogleStrategy } = google;
const { Strategy: GitHubStrategy } = github;
const LocalStrategy = require("passport-local").Strategy;

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

const host = prod ? "https://code-marka.herokuapp.com" : "http://localhost:2001";


passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
}, (email: string, password: string, done: any) => {
    User.findOne({ email })
        .then((user) => {
            if(user){
                user.comparePassword(password,(err: any, isMatch: boolean): any => {
                    if(!isMatch || err) {
                        return done(null, false, { message: "email or password is invalid" });
                    }
                    return done(null, user);
                });
            } else {
                return done(null, false, { message: "Account does not exist"});
            }
            
        }).catch(done);
}));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${host}/api/v1/auth/github/callback`,
    scope: ["user:email","read:user"]
},
function(accessToken, refreshToken, profile: any, done) {
    const githubid = profile.id;
    const displayName = profile._json.login;
    const githubemail = profile.emails[0].value;
    const profilePhoto = profile._json.avatar_url;
    //check email
    
    User.findOne({email: githubemail},(err, user) => {
        if(err) done(err,null);

        if(user ){
            // connect account     
            user.githubid = githubid;
            user.tokens.push({   
                kind: "github",
                accessToken,
                refreshToken,
            });
        
            user.profile.name = profile.displayName;
            user.profile.picture = profilePhoto;
            
            user.profile.firstname = profile.displayName.split(" ")[0] || "";
            user.profile.lastname = profile.displayName.split(" ")[1] || "";
            user.gravatarUrl = profilePhoto;
            user.username = displayName.replace(" ","_");
            // confirm account since user can access github account using same email asssociated with github
            user.isConfirmed = true;
        
            user.save((err, connectGithubUser) => {
                if(err) done(err,null);
                if(connectGithubUser){
                    return done(null, connectGithubUser);
                }else {
                    done(null,null);
                }
            }); 
        } else {
            // create or login exiting user
            User.findOne({ githubid }, (err, existingUser) => {
                if (err) { return done(err); }
                if (existingUser) {
                    // user exists, log in
                    return done(null, existingUser);
                }    
            
                //link account with github details;
            
                const user = new User();
                user.email = githubemail.toLowerCase();
                user.githubid = githubid;
                user.tokens.push({   
                    kind: "github",
                    accessToken,
                    refreshToken,
                });
                user.kid = randomString(40);
            
        
                user.isConfirmed = true;
                user.username = String(displayName).toLowerCase().replace(" ","_");
                user.gravatarUrl = profilePhoto;
                user.profile.firstname = profile.displayName.split(" ")[0] || "";
                user.profile.lastname = profile.displayName.split(" ")[1] || "";
                user.profile.name = profile.displayName;
                user.profile.picture = profilePhoto;
                user.save((err) => {
                    //send Welcome mail;
                    if(err) done(err,null);

                    let trial = 0;
                    let maxTrial = 2;
                    let sent = false;
                    const sendWelcomeEmailToUser = (email: string): void => {

                        const trimedEmail = email.trim();

                        const emailTemplate = `
                <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                <h4><b>H ${displayName},</b></h4>
                <b>Thanks for joinig us at codemarka!</b>
                <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                from your homepage, all the best!
                </p>
                <p><a href='https://codemarka.dev/auth/signin?ref=confirm'>Login</a></p>
                </div>
                `;

                        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                        const msg = {
                            to: trimedEmail,
                            from: "Codemarka@codemarak.dev",
                            subject: "Welcome To Codemarka",
                            text: "Welcome to codemarka!",
                            html: emailTemplate,
                        };

                        if(trial <= maxTrial){
                            try {
                                sgMail.send(msg,true,(err: any,resp: unknown) => {
                                    if(err){
                                        // RECURSION
                                        trial++;
                              
                                        sendWelcomeEmailToUser(trimedEmail);
                                    } else {
                            
                                        // BASE
                                        sent = true;
                                        done(null, user);

                                    }
                            
                                });
                            } catch (e) {
                                done(e,user);
                            }
                   
                        } else {
                            // TERMINATION
                            sent = false;
                            done(null, user);

                        }

                    };
                    sendWelcomeEmailToUser(user.email);
                });
       
            });
        } 
        
    });

}
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${host}/api/v1/auth/google/callback`,
},
function(accessToken, refreshToken, profile, done) {
    const googleid = profile.id;
    const displayName = profile.displayName;
    const googleEmail = profile._json.email;
    const gender = profile._json.gender;
    const picture = profile._json.picture;
    Community.findOne({email: googleEmail}).then((community) => {
        if(community){
            return done(null, community);
        } else {
            User.findOne({email: googleEmail},(err, user) => {
                if(err) done(err,null);

                if(user ){
                    // connect account     
                    user.googleid = googleid;
                    user.tokens.push({   
                        kind: "google",
                        accessToken,
                        refreshToken,
                    });
        
                    user.profile.name = profile.displayName.replace(" ","_");
                    user.profile.firstname = profile.displayName.split(" ")[0];
                    user.profile.lastname = profile.displayName.split(" ")[1] || "";

                    user.profile.picture = picture;
                    user.gravatarUrl = picture;
        
                    // confirm account since user can access github account using same email asssociated with github
                    user.isConfirmed = true;
        
                    user.save((err, googleUserData) => {
                        if(err) done(err,null);
                        if(googleUserData){
                            return done(null, googleUserData);
                        }else {
                            done(null,null);
                        }
                    }); 
                } else {
                    // create or login exiting user
                    User.findOne({ googleid }, (err, existingUser) => {
                        if (err) { return done(err); }
                        if (existingUser) {
                            // user exists, log in
                            return done(null, existingUser);
                        }    
            
                        //link account with google details;
            
                        const user = new User();
                        user.email = googleEmail.toLowerCase();
                        user.googleid = googleid;
                        user.tokens.push({   
                            kind: "google",
                            accessToken,
                            refreshToken,
                        });
             
                        user.kid = randomString(40);
            
        
                        user.isConfirmed = true;
                        user.username = String(displayName) ? String(displayName).toLowerCase() : "";
                        user.gravatarUrl = picture;
                        user.profile.firstname = profile.displayName ? profile.displayName.split(" ")[0] : "";
                        user.profile.lastname = profile.displayName ? profile.displayName.split(" ")[1] : "";

                        user.profile.name = profile.displayName;
                        user.profile.picture = picture;
                        user.save((err) => {
                            //send Welcome mail;
                            if(err) done(err,null);

                            let trial = 0;
                            let maxTrial = 2;
                            let sent = false;
                            const sendWelcomeEmailToUser = (email: string): void => {

                                const trimedEmail = email.trim();

                                const emailTemplate = `
                <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                <h4><b>H ${displayName},</b></h4>
                <b>Thanks for joinig us at codemarka!</b>
                <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                from your homepage, all the best!
                </p>
                <p><a href='https://codemarka.dev/auth/signin?ref=confirm'>Login</a></p>
                </div>
                `;

                                sgMail.setApiKey(process.env.SENDGRID_API_KEY);

                                const msg = {
                                    to: trimedEmail,
                                    from: "Codemarka@codemarak.dev",
                                    subject: "Welcome To Codemarka",
                                    text: "Welcome to codemarka!",
                                    html: emailTemplate,
                                };

                                if(trial <= maxTrial){
                                    try {
                                        sgMail.send(msg,true,(err: any,resp: unknown) => {
                                            if(err){
                                                // RECURSION
                                                trial++;
                              
                                                sendWelcomeEmailToUser(trimedEmail);
                                            } else {
                            
                                                // BASE
                                                sent = true;
                                                done(null, user);

                                            }
                            
                                        });
                                    } catch (e) {
                                        done(e,user);
                                    }
                   
                                } else {
                                    // TERMINATION
                                    sent = false;
                                    done(null, user);

                                }

                            };
                            sendWelcomeEmailToUser(user.email);
                        });
       
                    });
                } 
        
            });
        }
    });

}
));

passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser(({kid}, done) => {
    User.findOne({kid}, (err, user) => {
        done(err, user);
    });
});
