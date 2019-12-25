import google from "passport-google-oauth";
import passport from "passport";

import {User} from "../models/User";

const { OAuth2Strategy: GoogleStrategy } = google;

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true

},
function(req: any,accessToken, refreshToken, profile, done) {
    
    if(req.user){
        
        User.findOne({ google: profile.id }, (err, existingUser) => {
            if (err) { return done(err); }
            if (existingUser && (existingUser._id !== req.user._id)) {
                done(err);
            } else {
                User.findById(req.user.id, (err, user) => {
                    if (err) { return done(err); }
                    user.google = profile.id;
                    user.tokens.push({
                        kind: "google",
                        accessToken,
                        refreshToken,
                    });
                    user.isConfirmed = true;
                    user.profile.name = user.profile.name || profile.displayName;
                    user.profile.gender = user.profile.gender || profile._json.gender;
                    user.profile.picture = user.profile.picture || profile._json.picture;
                    user.save((err) => {
                        done(err, user);
                    });
                });
            }
        });
    }
    User.findOne({ google: profile.id }, (err, existingUser) => {
        console.log(profile);
        if (err) { return done(err); }
        if (existingUser) {
            // user exists
            console.log("User exists", existingUser);
            return done(null, existingUser);
        }   

        User.findOne({ email: profile.emails[0].value }, (err, existingEmailUser) => {
            if (err) { return done(err); }
            if (existingEmailUser) {
                return done("There is already an account using this email address. Sign in to that account using your email and password.",existingEmailUser);
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
                    done(err, user);
                });
            }
        });
    });
}
));