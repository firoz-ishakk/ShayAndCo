const mongoose = require("mongoose")

const couponSchema = new mongoose.Schema({

    code:{
        type:String,
        required : true,
        unique:true
    },

    status:{
        type:String,
        default:'Listed'
    },

    user_allowed:{
        type:Number,
        required:true
    },

   

    minimum_purchase:{
        type:Number,
        required:true
    },

    claimed_users:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'userModels'
    }],

    last_update:{
        type:Date
    },
    expiry:{
        type:Date,
        required:true
    },

    discount:{
        type:Number,
        required:true
    }
})

const coupon = mongoose.model('coupon',couponSchema)
module.exports = coupon
