import mongoose from 'mongoose'
import {DB_NAME} from "../constants.js"



const connectDb = async () => {
  try {
    const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`DB CONNECTED SUCCESSFULLY ${connectionInstance.connection.host}`)
    
  } catch (error) {
    console.log("db is not connected",error);
    throw error
    
    
  }

  
}
export default connectDb




































// import mongoose from "mongoose";

// import { DB_NAME } from "../constants.js";

// const connectDB= async () => {
//     try {

//  const  ConnectionInstance  =    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//  console.log(`\n db connected !! db host: ${ConnectionInstance.connection.host}`);
 
        
//     } catch (error) {
//         console.log(`db not connected ${error}`);
//         throw error
        
        
//     }
    
// }

// export default connectDB
