import { Router } from "express";
import {registerUser,loginUser, logoutUser} from "../controllers/user.controler.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { refreshAccessToken } from "../controllers/user.controler.js";

const router = Router();

router.route('/register').post(

    upload.fields([{name:"avatar",maxCount:1},{name:"coverimage",maxCount:1}]),registerUser);

    router.route('/login').post(loginUser);


    //==========secured route==============================================================
    router.route('/logout').post(verifyJwt,logoutUser)
    router.route('/refresh-token').post(refreshAccessToken)


    


export default router;