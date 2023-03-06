const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({

address: [
    {
      fullName: {
        type: String,
        required:true
    
      },
      mobile: {
        type: Number,
        required:true
        
      },      
      pincode: {
        type: Number,
        required:true
     
      },
      city: {
        type: String,
        required:true
     
      },
      district: {
        type: String,
        required:true
      
      },
      landMark: {
        type: String,
        required:true
      
      },
      state: {
        type: String,
        required:true
   
      },
      access:{
        type:Boolean,
        default:true,

    }
    }
  ],
  user:{
    type:mongoose.Schema.Types.ObjectId,
    ref: 'userModels',
  
  }
 })


const address = mongoose.model("address", addressSchema);
module.exports = address;

