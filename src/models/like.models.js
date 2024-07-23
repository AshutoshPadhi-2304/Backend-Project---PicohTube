import mongoose , { mongo, Schema } from "mongoose";

const likeSchema = new Schema(
    {
        comment : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Comment"
        },
        likedBy: {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        video : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Video"
        },
        tweet : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Tweet"
        }
    },
    {timestamps : true}
)

export const Like = mongoose.model("Like", likeSchema)