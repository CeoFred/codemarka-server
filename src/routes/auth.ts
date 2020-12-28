import {postDeleteAccount, 
    postLogin,
    postSignup, emailVerification,
    postUpdatePassword,
    postUpdateProfile,
    refreshToken,
    handelGoogleAuthCallback,
    logout,
    passwordReset,
    accountRecovery,
    userAuthtokenVerify,
    handelGitHubAuthCallback,
    handleSlackAuth,
    verifyOauthFinalStepsToken,
    completeOauthAccountSetup
} from "../controllers/auth";
import express from "express";
import passport from "passport";
import {check} from "../middleware/check_Auth";


import {validate} from "../middleware/authValidate";

const router = express.Router();
//github auth
router.get("/github",passport.authenticate("github"));
//github callback

router.get("/github/callback", passport.authenticate("github", { failureRedirect: "https://codemarka.co/auth/signin?githubauth=failed&retry=true&r=existing_user_with_email" }), handelGitHubAuthCallback);

//google auth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/plus.login"], prompt: "consent"}));

//google auth callback
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "https://codemarka.co/auth/signin?gauth=failed&retry=true&r=existing_user_with_email" }), handelGoogleAuthCallback);

// update password
router.patch("/user/password/update", validate("passwordUpdate"),postUpdatePassword);
//login a user
router.post("/user/signin", validate("login"), postLogin );

//signup a user
router.post("/user/signup",validate("signup"), postSignup);

//logout a user

router.get("/user/logout",check, logout);

//check is username exists


// delete user account
router.delete("/user/delete/:userId",check, postDeleteAccount);

// refresh jwt token
router.post("/user/token/refresh", refreshToken);

// verify user authentication token
router.post("/user/token/verify",check, userAuthtokenVerify );


// update user profile
router.patch("/user/profile/update",check, postUpdateProfile);

//account recovery
router.post("/user/account/recovery", accountRecovery);

// password reset
router.post("/user/account/password/reset", passwordReset);

router.get("/account/user/verify/:token/:user", emailVerification);
// password reset 

router.get("/user/slack/oauth/external", handleSlackAuth);

router.get("/user/oauth/verify/:token/:userkid", verifyOauthFinalStepsToken);

router.post("/user/oauth/complete/:token/:userkid", completeOauthAccountSetup);

// all users
export default router;
