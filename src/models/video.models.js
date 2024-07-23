import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile : {        
            type : String,          // Cloudinary URL
            required : true
        },
        thumbnail : {
            type : String,          // Cloudinary URL
            required : true
        },
        owner : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        title : {
            type : String,
            required : true
        },
        description : {
            type : String,
            required : true
        },
        duration : {            // Cloudinary gives us duration along with a bunch of other file info
            type : Number,
            required : true
        },
        views : {
            type : Number,
            default : 0
        },
        isPublished : {
            type : Boolean,
            default : true,
        }
    }, 
    {timestamps : true}
)

videoSchema.plugin(mongooseAggregatePaginate)       // saare vids ek saath load nahi kar sakte dusre page mei rahe 

export const Video = mongoose.model("Video", videoSchema)