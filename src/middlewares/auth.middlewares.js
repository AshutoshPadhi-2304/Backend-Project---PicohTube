import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"

const verifyJWT = asyncHandler( async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if(!token){
            throw new ApiError(500, "No token Generated")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)     // await not required mostly
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(500, "User doenst Exist")
        }

        req.user = user
        next()

    } catch (error) {
        throw new ApiError(500, error?.message || "Invalid access token")
    }
})

export {verifyJWT}