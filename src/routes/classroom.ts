import express from "express";
import {fecthClassByUrlAlias,findClassRoom,downloadClassfiles, classroomPreview, createClassRoom,verifyClassroom, getTrending, verifyUserClassroom, getUserClassrooms} from "../controllers/classroom";
import {check} from "../middleware/check_Auth";

const router = express.Router();

// //  create a new classroom
router.post("/create", check, createClassRoom);

// // get details about a particular class
router.post("/verify/", verifyClassroom);

router.get("/verify/:userid/:classid",verifyUserClassroom);

router.get("/user/:userid",check, getUserClassrooms);

// // here we check if user is eligible to join a classroom
router.get("/trending/", getTrending);

router.get("/preview/:classroomKid", classroomPreview);

router.get("/search/:q", findClassRoom);

router.get("/download/:classroomid", downloadClassfiles);
/**
 * Route to handle alias request from cmarka.xyz
 */
router.get("/urlalias/validate/:id", fecthClassByUrlAlias);

export default router;
