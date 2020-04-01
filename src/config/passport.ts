/* eslint-disable @typescript-eslint/no-unused-vars */
import google from "passport-google-oauth";
import github from "passport-github";
import _ from "lodash";

import passport from "passport";
import sgMail  from "@sendgrid/mail";

import {User} from "../models/User";
import { randomNumber,randomString } from "../helpers/utility";

const { OAuth2Strategy: GoogleStrategy } = google;
const { Strategy: GitHubStrategy } = github;

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

const host = prod ? "https://code-marka.herokuapp.com" : "http://localhost:2001";
passport.serializeUser((user: any, done) => {
    done(null, user.kid);
});

passport.deserializeUser((kid, done) => {
    User.findOne({kid}, (err, user) => {
        done(err, user);
    });
});


passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/auth/github/callback",
    scope: ["user:email","read:user"]
},
function(accessToken, refreshToken, profile: any, done) {
    const githubid = profile.id;
    const displayName = profile._json.login;
    const githubemail = profile.emails[0].value;
    const profilePhoto = profile._json.avatar_url;
    //check email

    //if email exist, check if it has a google id, if it does not( account was created with password), return false else
    // if it does, return the user

    User.findOne({email:githubemail},(err,user) => {

        if(err) done(err);

        if(user && user.githubid === "" || !user.githubid){
            return done(null,null,{ message:"User exists with email"});
        } 
        else {
            
            User.findOne({ githubid,email: githubemail }, (err, existingUser) => {
                if (err) { return done(err); }
                if (existingUser) {
                    // user exists, log in
                    return done(null, existingUser);
                }    
                
                //link account with google details;
                
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
                user.username = displayName.toLowerCase();
                user.gravatar(20);

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
                    <div style="text-align:center">
                    <img src='https://avatars1.githubusercontent.com/oa/1186156?s=140&u=722efebddbd96ad8bea99643d79408cad51e6d86&v=4' height="100" width="100"/>
                    
                    </div>
                    <h4><b>Hey ${displayName},</b></h4>
                    <br/>

                    <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                    codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                    from your homepage, all the best!
                    </p>

                    <br/>
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
    callbackURL: `${host}/auth/google/callback`,
},
function(accessToken, refreshToken, profile, done) {
    const googleId = profile.id;
    const displayName = profile.displayName;
    const Googlemail = profile._json.email;
    //check email

    //if email exist, check if it has a google id, if it does not( account was created with password), return false else
    // if it does, return the user

    User.findOne({email:Googlemail},(err,user) => {

        if(err) done(err);

        // user used regular email and password for signup not google auth.
        if(user && String(user.googleid) === "" || user.googleid === undefined || user.googleid === null) done(null,false,{ message:"User exists with email"});

        else {
            
            User.findOne({ googleid:googleId,email: Googlemail }, (err, existingUser) => {
                if (err) { return done(err); }
                if (existingUser) {
                    // user exists, log in
                    return done(null, existingUser);
                }    
                
                //link account with google details;
                
                const user = new User();
                user.email = Googlemail.toLowerCase();
                user.googleid = googleId;
                user.tokens.push({
                    kind: "google",
                    accessToken,
                    refreshToken,
                });
                user.kid = randomString(40);
                
            
                user.isConfirmed = true;
                user.username = displayName.toLowerCase();
                user.gravatar(20);

                user.profile.name = profile._json.name.toLowerCase();
                user.profile.gender = profile._json.gender;
                user.profile.picture = profile._json.picture;
                user.save((err) => {
                    //send Welcome mail;
                    if(err) done(err,false);

                    let trial = 0;
                    let maxTrial = 2;
                    let sent = false;
                    const sendWelcomeEmailToUser = (email: string): void => {

                        const trimedEmail = email.trim();

                        const emailTemplate = `
                    <div style="margin:15px;padding:10px;border:1px solid grey;justify-content;">
                    <div style="text-align:center">
                    <img src='https://avatars1.githubusercontent.com/oa/1186156?s=140&u=722efebddbd96ad8bea99643d79408cad51e6d86&v=4' height="100" width="100"/>
                    
                    </div>
                    <h4><b>Hey ${profile.displayName},</b></h4>
                    <br/>

                    <p>Thank you for confirming your account, we want to use this opportunity to welcome you to the
                    codemarka community. Having confirmed your account, you can now create or hosts classroom sessions right
                    from your homepage, all the best!
                    </p>

                    <br/>
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