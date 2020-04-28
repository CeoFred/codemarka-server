import { getUpcomingClassrooms, rateCommunity, joinCommunity, leaveCommunity, getCommunity, getCommunities, emailVerification,uploadCommunityLogo, communityCreationFinal,communityContactInformationTemp, communityInfoTemp, communityLogoTemp, communityOrganizersTemp, communitySocailMediaTemp } from "../controllers/community";
import express from "express";
import { body, buildSanitizeFunction } from "express-validator";

import { multerUploads } from "../config/multer";

const router = express.Router();
const sanitizeBodyAndQuery = buildSanitizeFunction(["body","query","params"]);

router.post("/auth/create/info/temp",[ body("*").trim()], communityInfoTemp);

router.patch("/auth/create/contactInfo/temp/:kid", [body("*").trim()],communityContactInformationTemp);

router.patch("/auth/create/logo/temp/:kid", multerUploads, communityLogoTemp);

router.patch("/auth/create/socialInfo/temp/:kid", [ body("*").trim()],communitySocailMediaTemp);

router.patch("/auth/create/organizers/temp/:kid",[ body("*").trim().escape()], communityOrganizersTemp);

router.patch("/upload/logo", uploadCommunityLogo);

router.post("/auth/create/final/:kid", communityCreationFinal);

router.get("/account/verify/:vid/:kid",emailVerification);

router.get("/", getCommunities);

router.get("/:kid", getCommunity);

router.post("/rate/:kid", rateCommunity);

router.post("/membership/join/:kid", joinCommunity);

router.post("/membership/leave/:kid", leaveCommunity);

router.get("/upcoming/:kid", getUpcomingClassrooms);

// all users
export default router;
