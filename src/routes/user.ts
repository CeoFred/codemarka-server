import express from "express";
import {check} from "../middleware/check_Auth";
import {getUserInfo,unfollowUser, followUser, specialUpdate} from "../controllers/user";
const router = express.Router();


router.get("/u/:kid", check, getUserInfo);

router.post("/follow/:kid", check, followUser);

router.post("/unfollow/:kid", check , unfollowUser);

router.get("/special/updates", specialUpdate);
export default router;