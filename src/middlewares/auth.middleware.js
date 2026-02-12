import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt  from "jsonwebtoken";
import { User } from "../model/user.model";


//--------------------------------------JWT AUTHENTICATION MIDDLEWARE-------------------------------------------------------------
export const verifyJwt = asyncHandler(async (req,res,next) => {

try {
    //-------------------------ACCESS TOKEN FROM REQ COOKIES--------------------------------------------------------------
      const authHeader = req.header("Authorization");
const token = req.cookies?.accessToken || (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);
    
  

    if(!token){
        throw new ApiError(400,"unauthorized token ")
    }
    //--------------------------------------------DECODE TOKEN FROM JWT------------------------------------------------------------

    const decodeToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
//------------------------------------------FIND USER FROM DB----------------------------------------------------------------------
    const user=await User.findById(decodeToken?._id)

if(!user){throw new ApiError(400,"user token failed")}
//-------------------------------------ADD USER OBJECT TO REQ-----------------------------------------------------------------------
req.user = user
next()
    
} 
catch (error) {
    throw new ApiError(400,error?.message || "jwtverification failed")
    
}



    
})
