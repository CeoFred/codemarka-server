import express from "express";
import { createRoom, handleOauthRedirect } from "../controllers/slack";
import {check} from "../middleware/check_slack_auth";

const router = express.Router();

router.post("/classroom/create", check,  createRoom);
router.get("/install", handleOauthRedirect);
export default router;
