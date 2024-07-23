import { v2 as cloudinary } from "cloudinary";
import fs, { unlinkSync } from "fs"

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.API_NAME,
    api_secret : process.env.API_SECRET 
})

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        
        // UPLOAD THE FILE USING LOCAL FILE PATH THAT IS ALREADY IN OUR LOCAL SERVER
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })

        // File has been uploaded successfully
        //console.log(response.url);
        fs,unlinkSync(localFilePath)
        return response             // Return the entire file information after it is stored in cloud
    } catch (error) {
        fs.unlinkSync(localFilePath)         // Ye hone ke baad hii aage badhega as its a synchronous function
        // This removes the locally saved temporary file as upload operation failed
        console.log("File failed to upload on Cloudinary", error);
        return null
    }
}

export {uploadOnCloudinary}