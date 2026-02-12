import  {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../model/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { json, response } from "express";

//-------------------------------------------GENERATEACCESSANDREFRESHTOKEN---------------------------------------------------------
const  generateAccessAndRefreshToken = async function (userId) {
   try {
      //-------------CHECK USER IN DB------------------------------------
      const user = await User.findById(userId)
      //-------------GEN ACCESS AND REFRESH TOKEN------------------------

      const accessToken=user.generateAccessToken()
      const refreshToken=user.generateRefreshToken()
      //-------------SAVE REFRESH TOKEN IN USER REFRESH TOKEN-------------------
      user.refreshToken=refreshToken
      //-------------SAVE RT IN DB
      await user.save({validateBeforeSave:false})     
      //-------------RETURN AT AND RT ------------------------------------------------
      return  {accessToken,refreshToken}    
   } catch (error) {
      
      
      throw new ApiError (501,"something went wrng with generating acces and refresh token ")
      
   }
   
}
//--------------------------------------------------REGISTER USER------------------------------------------------------------------



const registerUser= asyncHandler(async(req,res)=>{
   //----------------------------GET DATA FROM FRONT END----------------------------------------------------------------------------
    const {fullname,username,email,password}= req.body;

    
//--------------------------------------------------CHECK ANY FIELD MISSING------------------------------------------------------
    if ([username,email,password].some(field=>field?.trim()==="")) {
        throw new ApiError(400,"All fields are required")
    }
    //--------------------------------------------------CHECK USER ALREADY EXISTED IN DB----------------------------------------
     const existedUser = await User.findOne({
        $or:[{email},{username}]
     })
     if(existedUser){
        throw new ApiError (409,"User already exists with this email or username")
    }
    //--------------------------------------------------GET LOCAL PATH FOR AVATAAR AND COVER IMAGE---------------------------------


  const avatarLocalPath = req.files?.avatar[0]?.path;
 let coverimageLocalPath;
 if (req.files && Array.isArray(req.files.coverimage)&&req.files.coverimage.length>0) {
      coverimageLocalPath = req.files.coverimage[0].path;
   
 }

    if(!avatarLocalPath){
        throw new ApiError (400,"avatar image is required")
    }

    //--------------------------------------------------UPLOAD AVATAR AND CI ON CLOUDINARY------------------------------------------
    const avatar= await uploadOnCloudinary(avatarLocalPath)
     const coverimage= await uploadOnCloudinary(coverimageLocalPath)

     if(!avatar){
        throw new ApiError (500,"Unable to upload avatar image , please try again later")
     }
     //--------------------------------------------------CREATE USER IN DB---------------------------------------------------------
     const user=await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase()
     })


     //--------------------------------------------------CHECK FOR USER CREATION ND Rem PASS AND RT FROM RESPONSE------------------
     const createduser = await User.findById(user._id).select("-password -refreshToken")
     if(!createduser){
        throw new ApiError (500,"Unable to create user , please try again later")
     }

     //--------------------------------------------------RETURN RESPONSE-----------------------------------------------------------

       return res.status(201).json(new ApiResponse(200,createduser,"User registered successfully"))
   })
   //--------------------------------------------------USER REGISTRATION END-------------------------------------------------------


// ------------------------------------------------------LOGIN USER-----------------------------------------------------------------
   const loginUser = asyncHandler(async (req,res,next) => {

       
//--------------------------------------------------DATA FROM FRONTEND-------------------------------------------------------------

   const {email,username,password} = req.body;
   //--------------------------------------------------CHECK PASS EMAIL OR USERNAME MISSING----------------------------------------
   if (!password) {
    throw new ApiError(400, "password is required")
   }
   if (!email && !username) {
      throw new ApiError(403,"username/email are required")
      
   }
   //--------------------------------------------------CHECK USER EXISTANCE IN DB--------------------------------------------------
const checkUser=await User.findOne({
   $or:[{email},{username}]
})
if (!checkUser) {
   throw new ApiError(404,"user not registered")
   
}
//--------------------------------------------------CHECK PASS VALIDATION---------------------------------------------------------
const isPassValid= await checkUser.isPasswordCorrect(password)
if (!isPassValid) {
   throw new ApiError(401,"wrong password detected")
}
//--------------------------------------------------GEN AT AND RT FROM ABOVE METHOD-------------------------------------------------
   const {accessToken,refreshToken}=await generateAccessAndRefreshToken(checkUser._id)
   //--------------------------------------------------FIND AN REMOVE PASS AND RT IN RESPONSE-------------------------------------


const userLoggedIn = await User.findById(checkUser._id).select("-password  -refreshToken")

const options = {
   httpOnly: true,
   secure: true,
   sameSite: "none"
}
//--------------------------------------------------SEND RESPONSE + COOKIES--------------------------------------------------------
return res.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
  
   {
       statusCode: 202,
      user: userLoggedIn,accessToken,refreshToken,
       message: "user logged in successfully"
   }
  )})

//--------------------------------------------------USER LOGIN END-----------------------------------------------------------------


//-------------------------------------------------------LOGOUT USER----------------------------------------------------------------

const logoutUser = asyncHandler (async (req,res) => {
//----------------------------------FIND AND UPDATE USER N DB USING REFRESH TOKEN---------------------------------------------------
   await User.findByIdAndUpdate(req.user_id,
      {
         $set:{refreshToken:undefined}
      }
      ,
      {
         new: true
      }
   )

   const options ={
      httpsOnly:true,
      secure: true
   }

//---------------------------------------------CLEAR COOKIE AND SEND RESPONSE------------------------------------------------------ 
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"user logout"))
  })
//--------------------------------------------------USER LOGOUTEND----------------------------------------------------------------

//-------------------------------------------------refresh token endpoint----------------------------------------------------------

const refreshAccessToken= asyncHandler(async (req,res) => {
   //------------------------------------INCOMING COOKIE FROM USER------------------------------------------------------------------
const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken

if (!incomingRefreshToken) {
   new ApiError(401,"unotherized request")
}

try {
   //--------------------------------------DECODE THE INCOMING COOKIE---------------------------------------------------------------
   const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
   //----------------------------------FIND DECODED COOKIE/TOKEN IN DB -------------------------------------------------------------
   
   const user=await User.findById(decodedToken?._id)
   
   if (!user) {
      new ApiError(401,"invalid refresh token")
   }
   //--------------------------------CHECK INCOMING TOKEN AND DB TOKEN IS SAME -----------------------------------------------------
   if (incomingRefreshToken!==user?.refreshToken) {
     
      new ApiError(401,"refresh token is expired or used")
   }
   
   const options={
      httpOnly:true,
      secure:true
   }
   //----------------------------------------------GENERATED REFRESH TOKEN IN ----------------------------------------------
   
   const {accessToken,newrefreshToken}=await generateAccessAndRefreshToken(user._id)
   //---------------------------------------------SEND COOKIES AND JSON RESPONSE----------------------------------------------------
   return res.status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",newrefreshToken,options)
   .json(
      new ApiResponse(
         200,
         {accessToken,newrefreshToken},
         "Acsess token refreshed"
      )
   )
} catch (error) {

   throw new ApiError(401,error?.message||"invalid refresh token")
   
}})


//---------------------------------------------END REFRESH TOKEN ENDPOINT-----------------------------------------------------------
//--------------- //------------------------change password---------------------------------------------------------------------
const changeCurrentPassword = asyncHandler(async (req,res) => {

   //------------------------get oldnnew pass-----
   const {oldPassword,newPassword}=req.body
   //------------------------find user--------------
  const user =  await User.findById(req.user?._id)
//------------------------check old pass correction--
 const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
if (!isPasswordCorrect) {
   throw new ApiError(400,"invalid old password")
}
//------------------------set new pass-------------

user.password= newPassword
//------------------------save in db-----------------
await user.save({validateBeforeSave:false})
//------------------------response----------------
return res.status(200).json(new ApiResponse(200,{},"password changed successfully"))
})

const getCurrentUser= asyncHandler(async (req,res) => {
   return res.status(200)
   .json(203,req.user," cuurent user fetched")
})
// -------------------------------update account details---------------------------------------------------------------------------

     const updateAccountDetails= asyncHandler(async (req,res) => {
   //------------------------getdata from frontend----
   const {email,fullname}=req.body
   if(!fullname&&!email){
      throw new ApiError(400,"all fields required")
   }
 //------------------------ get user from db-----
 const user= await User.findByIdAndUpdate(
   req.user?._id,

   {
      $set:{
         fullname,email
      }
   },
   {new:true}
   ).select("-password")
//------------------------return response------------
return res.status(200)
.json(new ApiResponse(200,user,"details updated"))
})

const revupdateCoverImage = asyncHandler(async (req,res) => {

   const coverimageLocatPath = req.file.coverimage.path
   const coverimage= await uploadOnCloudinary(coverimageLocatPath)
   const user= await User.findByIdAndUpdate(req.file._id,
      {$set:{coverimage:coverimage.url}},
      {new:true}
   ).select("-password")

   return res.status(200).json(200,user,"coverimage updated successfully")
})
//------------------------update details end----------


//------------------------update avatar--------------
const updateUserAvatar= asyncHandler(async (req,res) => {
   //------------------------get localpath
   const avatarLocalPath=req.file?.path
   if(!avatarLocalPath){
      throw new ApiError(200,"upload again")
   }
   //------------------------upload on cloudinary---
   const avatar=await uploadOnCloudinary(avatarLocalPath)
if (!avatar.url) {
   throw new ApiError(500,"cloud upload failed")
   
}
//------------------------find and update in db----
const user=await User.findByIdAndUpdate(
   req.user?._id,
   {
      $set:{
         avatar: avatar.url
      }
   },
   {new: true}
).select("-password")
//------------------------response------------
return res.status(200).json(new ApiResponse(200,user,"avatar updated succesfully"))
})
//--------------------------update coverimage------------------------------------------------------------
const updateUserCoverImage = asyncHandler(async (req,res) => {
   const avatarLocalPath = req.file?.path
   if(!avatarLocalPath){
      throw new ApiError(400,"AVATAR UPDATION LOCAL PATH ERROR")}

      const avatar = uploadOnCloudinary(avatarLocalPath)
      if (!avatar) {
         throw new ApiError(400,"cloudinary avatar field")
         
      }

      const user = User.findByIdAndUpdate(req.user?._id,
         {
            $set:{coverimage:coverimage.url}
         }
         ,{new:true}
).select("-password")
res.status(200)
.json(new ApiResponse(200,user,"cover image updated"))
})
//---------------------------updatecoverimage end---------------------------------------------------------

const revUserProfile = asyncHandler(async (req,res) => {

   const {username} = req.params
   if(!username?.trim()){throw new ApiError(400,"user doenst found")}


   const revChannel = await User.aggregate([



    {
      $match:{
         username:username.toLowerCase()
      }
    },


    {
      $lookup:{

         from: "subscriptions",
         localField: "_id",
         foreignField: "channel",
         as: "subscriber"
},
$lookup:{
from: "subscriptions",
         localField: "_id",
         foreignField: "subscriber",
         as: "subscribeTo"

}
    }






















   ])

   
})


























//------------------------------user profile channel------------------------------------------------------
const getUserChannelProfile = asyncHandler(async (req,res) => {
   //---------------------check for user name----------------------------------------------------------
   const {username} = req.params
   if(!username?.trim()){throw new ApiError(400,"username is missing")}
 //------------------------pipelines-------------------------------------------------------------------
   const channel = await User.aggregate([
      //------------------------------match username document pipeline-----------------------------------
      {
         $match:{
            username: username?.toLowerCase()
         }
      },
      //-----------------------------looksups----------------------------------------------------------
      {
         $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: " channel",
            as: "subcribers"
         }
      },

      {
         $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField:"subscriber",
            as: "subcribedTo"
         }
      },
      {
         $add:{
            subscriberCount:{
               $size: "$subscribers"
            },

             channelsubscribedtocount:{
               $size: "$subscribedTo"
             },
             isSubscribed: {
               $condition:{
                  if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                  then:true,
                  else: false
               }
             }
         }
      },
      // --------------------------project------------------------------------------------------------
      {
         $project:{
            fullname: 1,
            username :1,
            avatar: 1,
            channelsubscribedtocount:1,
            subscriberCount:1,
            isSubscribed:1,
            coverimage:1
         }
      }

])
//------------------------------------piepeline end ----------------------------------------------------

return res.status(200)
.json(new ApiResponse(200,channel[0],"user data fetched"))


























})














































































































































    export {
      registerUser,
      loginUser,
      logoutUser,
      refreshAccessToken,
      changeCurrentPassword,
      getCurrentUser,
      updateAccountDetails,
      updateUserAvatar,
      updateUserCoverImage,
      getUserChannelProfile,
    } ;

   