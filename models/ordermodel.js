const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "userModels",
      required: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Types.ObjectId,
          ref: "products",
          required: true,
        },
        qty: {
          type: Number,
          required: true,
        },
        productprice: {
          type: Number,
        },
      },
    ],
    totalPrice: {
      type: Number,
      default: 0,
    },

    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'address'
    },
    totalPrice: Number,

    orderStat: {
      type: String,
      required: true,
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
