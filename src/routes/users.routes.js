import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser, changePassword, getCurrentUser, updateAvatar, updateCoverImage, updateDetails, getChannelUserProfile, getWatchHistory } from "../controllers/users.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router = Router()

router.route("/register").post(upload.fields(
    [
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]
),registerUser)

router.route("/login").post(loginUser)      // login

// secured routes

router.route("/logout").post(verifyJWT, logoutUser)         // logout
router.route("/refresh-token").post(refreshAccessToken)

router.route("/password").post(verifyJWT, changePassword)
router.route("/updateDetails").patch(verifyJWT, updateDetails)
router.route("/current-user").get(verifyJWT, getCurrentUser)


router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)       // Change avatar 
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)       // Change cover image 

router.route("/channel/:userName").get(verifyJWT, getChannelUserProfile)    // get channel profile info
router.route("/history").get(verifyJWT, getWatchHistory)                // get Watch history

export default router