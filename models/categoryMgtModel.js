const mongoose = require("mongoose")

const categoryMgtSchema = new mongoose.Schema({
title:{
        type : String,
        unique : true,
        required : true
   },

image:{
        type:String,
        required:true
   },


description :{
        type:String,
        required:true
   },

access:{
        type:Boolean,
        default:true,

   }


})

module.exports = mongoose.model("category", categoryMgtSchema);