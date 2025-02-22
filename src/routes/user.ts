import express from "express";
import {check} from "../middleware/check_Auth";
import {getUserInfo,unfollowUser,  followUser, specialUpdate,
    checkUsername, getUserWithEmailOrUsername
} from "../controllers/user";
const router = express.Router();

router.get("/u/:username", check, getUserInfo);

router.post("/follow/:kid", check, followUser);

router.post("/unfollow/:kid", check , unfollowUser);

router.get("/special/updates", specialUpdate);

router.get("/username", checkUsername);

router.get("/find/:emailOrUsername", check, getUserWithEmailOrUsername);

export default router;