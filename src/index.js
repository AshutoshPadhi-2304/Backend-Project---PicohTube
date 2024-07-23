// require('dotenv').config({path: './env'})

import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path : './env'
})

connectDB()
.then(() => {
    const port = process.env.PORT || 8000
    app.listen(port, () => {
        console.log("App has Started and is listening on port :", port);
    })
})
.catch((error) => {
    console.log("Express Error : ", error);
})