import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // put refreshToken in DB
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})     // Change in DB saved
        
        return {accessToken, refreshToken}  // accessToken and refreshToken returned
    } catch (error) {
        throw new ApiError(500, "Token Not Generated")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // Get user details from the frontend or postman
    
    const {userName, email, fullName, password} = req.body     // this sends the json and forms data to the backend 


    // Validation of user details 
    
    if( [userName, email, fullName, password].some((field) => (
        field?.trim() === ""
    ))){
        throw new ApiError(400, "All Fields are Required")
    }
    
    
    // check if account already exists - username and email
    
    const existingUser = await User.findOne({       // DB function used do await
        $or : [{email}, {userName}]
    })
    console.log("THe exisitng user is ", existingUser);
    if(existingUser){
        throw new ApiError(409, "User already exists")
    }
    console.log(req.files);

    // check for avatar and coverImage
    const avatarLocalPath = req.files?.avatar[0]?.path      // req,files access given by multer as we addded it as middleware in Routes
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar Required")
    }


    // If avatar present upload into cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)            // as it will take time
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    // check if the avatar got uploaded in cloudinary 

    if(!avatar){
        throw new ApiError(400, "Avatar Not uploaded in Cloadinary")
    }


    // create an user object in MongoDB

    const user = await User.create({           // .create takes object       // as DB mei create kar rahe it will take time so await
        fullName,
        userName : userName.toLowerCase(),
        email,
        password,
        avatar : avatar.url,
        coverImage : coverImage?.url || ""       // As we have not checked if coverImage exists we put a check
    })

    
    // check if user created by the help of the response ( User.findById(user._id))
    // return the user details response without the password and refreshToken AND CHECK IF USER CREATED OR NOT 
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500, "User is not Registered")
    }
    
    
    // return response

    return res.status(201).json(            // WE wanted a organised response 
        new ApiResponse(200, createdUser,  "Success in creating User")
    )
})

const loginUser = asyncHandler( async(req, res) => {
    // Take email, username, password

    const {userName, email, password} = req.body


    // Check if email or username empty ( VALIDATION )

    if(!(email || userName)){
        throw new ApiError(400, "Email or UserName Required")
    }


    // Check if user exists using username or email

    const user = await User.findOne({   // dono mei se koi ek dhoondh
        $or: [{email}, {userName}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    // Check if password is correct                      // User - mongoose object user - hamara object hai that has access to user
    const checkPassword = await user.isPasswordCorrect(password)     // we are using bcrypt it will take time
    if(!checkPassword){
        throw new ApiError(401, "Incorrect Password")
    }

    // IF password is correct send refreshToken And accessToken
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // send in secure cookies
    const options = {       // An object to make our cookie secure as it can only be accessed by server and not by frontend
        httpOnly : true,
        secure : true
    }
    return res.status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            user : loggedInUser , accessToken, refreshToken
        } , "The User has been logged in")
    )
})


// Logout User
const logoutUser = asyncHandler( async (req, res) => {
    // access user by the use of custom middleware
    const user = req.user
    
    // Remove the refresh Token from the DB
    await User.findByIdAndUpdate(user._id, 
        {
            $unset : {refreshToken : 1}     // removes refreshToken from document
        },
        {
            new : true      // response mei new updated value aayega
        }
    )

    // Removes the cookies from the user 
    const options = {
        httpOnly : true,
        secure: true
    }
    res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged Out"))
    
})

const refreshAccessToken = asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(400, "Unauthorized Request")
    }

    try {
        const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedRefreshToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401, "Refresh Token is used or expired")
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        const options = {
            httpOnly : true,
            secure : true
        }
        
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken, newRefreshToken}, "New Access Token is Provided")
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refreshAccessToken")
    }

})

const changePassword = asyncHandler( async(req, res) => {
    // this controller is run only if user is logged in
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id) 
    if(!user){
        throw new ApiError(400, "Invalid Access")
    }
    const isUserPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isUserPasswordCorrect){
        throw new ApiError(400, "Enter Correct Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})
    
    // Send msg to user that the password is changed
    return res
    .status(200)
    .json(new ApiResponse(200,{} ,"Password changed successfully"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
    const user = req.user

    return res.status(200)
    .json(new ApiResponse(200, user, "Current User"))
})

const updateDetails = asyncHandler( async(req, res) => {
    // this controller is run only if user is logged in
    const {fullName, email} = req.body      // These details can be changed by the user. Both required to be changed 

    if(!(fullName && email)){
        throw new ApiError(400, "Enter all the details")
    }
    const userId = req.user?._id
    const user = await User.findByIdAndUpdate(userId,
        {
            $set : {
                fullName : fullName,
                email : email
            }
        },
        {
            new : true
        }.select("-password -refreshToken")
    )

    res.status(200)
    .json(
        new ApiResponse(200, user, "User details has been changed")
    )

})

const updateAvatar = asyncHandler( async(req, res) => {
    const avatarLocalPath = req.file()     // as we are uploading only one file that has to be updated
    
    // check if local path of avatar sent
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar File Has To Be Uploaded")
    }
    // Upload the local file On Cloudinary
    const avatar = uploadOnCloudinary(avatarLocalPath)  // sends the entire avatar object uploaded on cloudinry

    if(!avatar.url){        // check if files is uploaded on cloudinary
        throw new ApiError(500, "Error while Uploading file to Cloudinary")
    }

    // Find user and update the avatar url
    const userId = req.user?._id
    const user = await User.findByIdAndUpdate(userId,
        {
            $set : {
                avatar : avatar.url    
            }
        },{
            new : true
        }
    ).select("-password -refreshToken")

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar Image Changed"))

})

const updateCoverImage = asyncHandler( async() => {
    const coverImageLocalPath = req.file

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cant find the local Path for cover Image")
    }

    const coverImage = uploadOnCloudinary(coverImageLocalPath)
    if(coverImage.url){
        throw new ApiError(500, "Couldnt upload cover image on Cloudinary")
    }

    const userId = req.user?._id

    const user = await User.findByIdAndUpdate(userId,
        {
            $set: {
                coverImage : coverImage.url
            }
        },
        {
            new : true
        }
    )

    return res.status(200)
    .json(new ApiResponse(200, user, "CoverImage is changed successfully"))
})

const getChannelUserProfile = asyncHandler( async(req, res) => {        
    const {userName} = req.params

    if(!userName ?.trim()){
        throw new ApiError(400, "User Not Found while getting channel profile")
    }

    // get total subs
    const channel = await User.aggregate([
        {
            $match : {
                userName : userName?.toLowerCase()
            }
        },
        {
            $lookup : {
                    from : "subscriptions",
                    localField : "_id",
                    foreignField : "channels",
                    as : "Subscribers"
            }
        },
        {                                                                      // subbed to pipeline
            $lookup : {
                from : "subscription",
                localField : "_id",
                foreignField : "subscriber",
                as : "SubbedTo"
            }
        },
        {                                                                   // add the fields
            $addFields : {
                subscriberCount : {
                    $size : "$Subscribers"
                },
                subbedToCount : {
                    $size : "$SubbedTo"
                },
                isSubbed : {
                    $cond : {
                        if : {
                            $in : [req.user ?._id, "$Subscribers.subscriber"]
                        },
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName: 1,
                userName : 1,
                subscriberCount : 1,
                subbedToCount : 1,
                isSubbed : 1,
                email : 1,
                avatar : 1,
                coverImage : 1,
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel is not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel details are returned")
    )
})

const getWatchHistory = asyncHandler( async(req, res) => {

    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "videoDetails",
                pipeline : [{
                    $lookup : {
                        from : "users",
                        localField : "owner",
                        foreignField : "_id",
                        as : "owner",
                        pipeline : [{
                            $project : {
                            fullName : 1,
                            userName : 1, 
                            avatar : 1
                        }                             
                        }]
                    }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]) 
    if(!user){
        throw new ApiError(400, "user not found while searching for watch history")
    }
    return res.status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch History Found")
    )
})


export {registerUser, loginUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, 
    updateDetails, updateAvatar, updateCoverImage, getChannelUserProfile, getWatchHistory}