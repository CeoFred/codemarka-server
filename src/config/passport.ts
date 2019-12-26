/* eslint-disable @typescript-eslint/no-unused-vars */
import google from "passport-google-oauth";
import github from "passport-github";
import _ from "lodash";

import passport from "passport";
import sgMail  from "@sendgrid/mail";

import {User} from "../models/User";

const { OAuth2Strategy: GoogleStrategy } = google;
const { Strategy: GitHubStrategy } = github;

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

const host = prod ? "https://colabinc.herokuapp.com" : "http://localhost:2001";
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});


passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${host}/auth/github/callback`,
    passReqToCallback: true,
    scope: ["user:email","read:user"]
},
function(req: any,accessToken, refreshToken, profile: any, done) {
     
    User.findOne({ github: profile.id }, (err, existingUser) => {
        if (err) { return done(err); }
        if (existingUser) {
            console.log("Existing User");
            const ip = req.connection.remoteAddress || req.headers["x-forwarded-for"];
            existingUser.updatedLastLoginIp(ip);
            return done(null, existingUser);
        }
        const pEmail = _.get(_.orderBy(profile.emails, ["primary", "verified"], ["desc", "desc"]), [0, "value"], null);
        User.findOne({ email: pEmail }, (err, existingEmailUser) => {
            if (err) { return done(err); }
            if (existingEmailUser) {
                done(err,existingEmailUser,{ msg: "There is already an account using this email address. Sign in to that account and link it with GitHub manually from Account Settings." });
            } else {
                console.log("new user");
                console.log(profile);
                const user = new User();
                user.email = pEmail;
                user.github = profile.id;
                user.username = profile.displayName;
                user.tokens.push({ kind: "github", accessToken });
                user.profile.name = profile.displayName;
                user.profile.picture = profile._json.avatar_url;
                user.profile.location = profile._json.location;
                user.profile.website = profile._json.blog;
                user.save((err) => {
                    if(err) done(err, user);
                        
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

                        sgMail.setApiKey("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");

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
            }
        });
    });
    
}
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${host}/auth/github/callback`,
    passReqToCallback: true

},
function(req: any,accessToken, refreshToken, profile, done) {
    
    
    User.findOne({ google: profile.id }, (err, existingUser) => {
        if (err) { return done(err); }
        if (existingUser) {
            // user exists
            return done(null, existingUser);
        }   

        User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
            if (err) { return done(err); }
            if (existingEmailUser) {
                const ip = req.connection.remoteAddress || req.headers["x-forwarded-for"];
                existingEmailUser.updatedLastLoginIp(ip);
                return done(null,existingEmailUser);
            } else  {
                //link account with google details;
                
                const user = new User();
                user.email = profile.emails[0].value;
                user.google = profile.id;
                user.tokens.push({
                    kind: "google",
                    accessToken,
                    refreshToken,
                });
                user.isConfirmed = true;
                user.username = profile.displayName;
                user.profile.name = profile.displayName;
                user.profile.gender = profile._json.gender;
                user.profile.picture = profile._json.picture;
                user.save((err) => {
                    //send Welcome mail;
                    if(err) done(err,user);

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

                        sgMail.setApiKey("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");

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
            }
        });
    });
}
));