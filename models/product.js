const mongoose = require("mongoose")

const productMgtSchema = new mongoose.Schema({
    
    brand:{
        type:String,
        require:true
    },

    title:{
        type:String,
        required:true,
        unique:true,
        index:true
    },

    description:{
        type:String,
        required:true
    },

    price:{
        type:Number,
        required:true
    },

    category:{
        type:mongoose.Types.ObjectId,
        ref:"category"
    },

    images:{
        type:Array,
        required:true
    },
    stock:{
        type:Number,
        required:true
    },
    access:{
        type:Boolean,
        default:true
    }
})

module.exports = mongoose.model("products", productMgtSchema);