import {postDeleteAccount, 
    postLogin, tokenVerify,
    postSignup, emailVerification,
    postUpdatePassword,
    postUpdateProfile,
    refreshToken,
    handelGoogleAuthCallback
} from "../controllers/auth";
import express from "express";
import passport from "passport";

import {validate} from "../middleware/authValidate";

const router = express.Router();
//github auth
router.get("/github",passport.authenticate("github"));
//github callback

// router.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), (req, res) => {
//     res.redirect(req.session.returnTo || "/");
// });

//google auth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/plus.login"], prompt: "consent"}));

//google auth callback
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "https://codemarka.dev/auth/signin?gauth=failed&retry=true" }), handelGoogleAuthCallback);

// update password
router.patch("/user/password/update", validate("passwordUpdate"),postUpdatePassword);
tokenVerify;
//login a user
router.post("/user/signin",validate("login"), postLogin);

//signup a user
router.post("/user/signup",validate("signup"), postSignup);

// delete user account
router.delete("/user/delete/:userId", postDeleteAccount);

// refresh jwt token
router.post("/user/token/refresh", refreshToken);

// verify token
router.post("/user/token/verify", tokenVerify );
// update user profile
router.patch("/user/profile/update", postUpdateProfile);

//account recovery
router.post("/user/account/recovery", postDeleteAccount);

router.get("/account/user/verify/:token/:user", emailVerification);
// password reset 

// all users
export default router;
