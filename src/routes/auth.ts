import {postDeleteAccount, postLogin, tokenVerify, postSignup, postUpdatePassword,postUpdateProfile,refreshToken} from "../controllers/auth";
import express from "express";
import {validate} from "../middleware/authValidate";

const router = express.Router();
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

// password reset 

// all users
export default router;
