import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'

dotenv.config({
    path:'./.env'
})
connectDB()
.then(()=>{
app.on("error",(error)=>{
    console.log("port lishting error",error)
    throw error
    
})
app.listen(process.env.PORT||7000,()=>{
        console.log("APP IS LISHTING ON PORT :",process.env.PORT );
        
    })
})
.catch((error)=>{
    console.log(`mongo db connection error ${error}`);
    throw error
    
})












































// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// import express from 'express'
// import dotenv from "dotenv"
// dotenv.config()
// const app=express()



// ;(async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

//         app.on("error",(error)=>{
//           console.log("not connect",error)
//           throw error
          
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log("app is listning on ",process.env.PORT);
            
//         })
        
//     } catch (error) {
//         console.log("DB NOT CONNECTED",error)
//         throw error
        
//     }
// })()