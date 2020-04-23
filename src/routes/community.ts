import {emailVerification,uploadCommunityLogo, communityCreationFinal,communityContactInformationTemp, communityInfoTemp, communityLogoTemp, communityOrganizersTemp, communitySocailMediaTemp } from "../controllers/community";
import express from "express";
import { body } from "express-validator";

import { multerUploads } from "../config/multer";

const router = express.Router();

router.post("/auth/create/info/temp",[ body("*").trim().escape()], communityInfoTemp);

router.patch("/auth/create/contactInfo/temp/:kid", [ body("*").trim().escape()],communityContactInformationTemp);

router.patch("/auth/create/logo/temp/:kid", multerUploads, communityLogoTemp);

router.patch("/auth/create/socialInfo/temp/:kid", [ body("*").trim().escape()],communitySocailMediaTemp);

router.patch("/auth/create/organizers/temp/:kid",[ body("*").trim().escape()], communityOrganizersTemp);

router.patch("/upload/logo", uploadCommunityLogo);

router.post("/auth/create/final/:kid", communityCreationFinal);

router.get("/account/verify/:vid/:kid",emailVerification);

// all users
export default router;
