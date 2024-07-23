import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        userName : {
            type : String,
            required: true,
            lowercase : true,
            unique : true,
            trim : true,
            index : true
        },
        email : {
            type : String,
            required : true,
            unique : true,
            trim : true,
            lowercase : true
        },
        fullName : {
            type : String,
            required : true,
            index : true,
            trim : true
        },
        avatar : {
            type : String,      // Cloudinary URL
            required : true
        },
        coverImage : {
            type : String,      // Cloudinary URL
        },
        password : {
            type : String,
            required : [true, "Password is required"]       // CUSTOM ERROR MSG
        },
        refreshToken : {
            type : String
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ]
    },
    {timestamps : true}
)

userSchema.plugin(mongooseAggregatePaginate)

// crypt password before saving
userSchema.pre("save" , async function(next){
    if(this.isModified("password")) this.password = await bcrypt.hash(this.password, 10)
    next()
})

// check if password is correct
userSchema.methods.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){

    return jwt.sign(
        {
            _id : this._id,                         // PAYLOAD
            userName : this.userName ,
            fullName : this.fullName,
            email: this.email             
        },
        process.env.ACCESS_TOKEN_SECRET,        // SECRET KEY
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY         // EXPIRY TIME
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)