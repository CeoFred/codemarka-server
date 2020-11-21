import express from "express";
import { createRoom} from "../controllers/slack";
import {check} from "../middleware/check_slack_auth";

const router = express.Router();

router.post("/classroom/create", check,  createRoom);
export default router;
