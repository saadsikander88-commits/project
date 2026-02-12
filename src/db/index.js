import mongoose from 'mongoose'
import {DB_NAME} from "../constants.js"



const connectDb = async () => {
  try {
    const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log(`DB CONNECTED SUCCESSFULLY !! Host: ${connectionInstance.connection.host}`);
    
  } catch (error) {
    console.log("db is not connected",error);
    throw error
    
    
  }

  
}
export default connectDb
