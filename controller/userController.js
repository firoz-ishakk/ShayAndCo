const userHelpers = require("../helpers/userhelpers");
const { response } = require("../routes/adminroute");
const productData = require("../models/product");
const categoryMgtModel = require("../models/categorymgtmodel");
const usersession = require("../models/usermodels");
const otpHelper = require("../util/otp");
const User = require("../models/usermodels");
const Order = require("../models/ordermodel")
const Address = require("../models/address")
const Coupon = require("../models/couponmodel")

const objId = require('mongoose').Types.ObjectId;
const { findById, findByIdAndUpdate } = require("../models/usermodels");
const {
  ConversationPage,
} = require("twilio/dist/lib/rest/conversations/v1/conversation");
const { validateBody } = require("twilio/dist/lib/webhooks/webhooks");
const { log } = require("console");

const userHome = async (req, res) => {
  try {
    let productlisting = await productData
      .find({ access: true })
      .populate("category");
    // console.log("products: ", productlisting);
    const user = await usersession.findById(req.session.userId);
    let cartprice = 0;
    let cartlength = 0;
    if (req.session.userId) {
      cartprice = user.cart.totalPrice;
      cartlength = user.cart.items.length;
      // console.log(cartlength, " over herree");
    }

    res.render("userHome", {
      products: productlisting,
      loginaccess: user,
      cartlength,
      cartprice: cartprice,
    });
  } catch (error) {
    console.log("no home page");
    console.log(error);
  }
};

const userLogin = (req, res, next) => {
  try {
    if (req.session.userId) {
      res.redirect("/home");
    } else {
      let err = req.session.error;
      req.session.error = false;
      console.log("error: ", err);
      res.render("userLogin", { err });
    }
  } catch (error) {
    console.log("page not found");
    next(error);
  }
};

const userSignup = (req, res, next) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    }
    res.render("userSignup");
  } catch (error) {
    console.log("404 not found ", error);
    next(error);
  }
};

const userOtp = (req, res, next) => {
  try {
    res.render("userOtp");
  } catch (error) {
    console.log("page not found");
    next(error);
  }
};

const doRegister = (req, res, next) => {
  try {
    userHelpers.doRegister(req.body, res, req, (user) => {
      res.redirect("/otp");
    });
  } catch (error) {
    next(error);
  }
};

const loggedIn = (req, res, next) => {
  try {
    userHelpers.doLogin(req, res);
    
  } catch (error) {
    next(error);
  }
};

const otpVerification = (req, res,next) => {
  try {
    userHelpers.otp(req.body.otp, res, (user) => {
      req.session.loggedIn = true;
      res.redirect("/home");
    });
  } catch (error) {
    next(error);
  }
};

const shop = async (req, res) => {
  let selectedCat = "";
  let productsList;
  let typeData = {
    type: "listing",
    key: null,
  };
  let pagination = {
    q: 1,
    skip: 0,
    limit: 20, //Limit can be changed here!
    totalcount: 0,
    urlpath: "?page=",
  };

  if (req.query.page) {
    if (req.query.page > 1) {
      pagination.skip =
        pagination.limit * Number(req.query.page) - pagination.limit;
      // pagination.limit =pagination.limit*Number(req.query.page);
      pagination.q = Number(req.query.page);
    }
  }
  if (req.query.cat) {
    selectedCat = req.query.cat;
    try {
      productsList = await productData
        .find({ category: req.query.cat, access: { $ne: false } })
        .populate("category");
      pagination.totalcount = await productData.countDocuments({
        category: req.query.cat,
        access: { $ne: false },
      });
      pagination.urlpath = "?cat=" + req.query.cat + "&page=";
    } catch (error) {
      next(createError(404));
    }
    typeData.type = "catlisting";
  } else if (req.query.q) {
    typeData.type = "qlisting";
    typeData.key = req.query.q.toString();

    try {
      let skey = req.query.q;
      let regex = new RegExp("^" + skey + ".*", "i");
      productsList = await productData
        .aggregate([
          {
            $match: {
              $or: [{ title: regex }, { description: regex }, { brand: regex }],
              access: { $ne: false },
            },
          },
        ])
        .skip(pagination.skip)
        .limit(pagination.limit);
      pagination.totalcount = await productData.countDocuments({
        $or: [{ title: regex }, { description: regex }, { brand: regex }],
        access: { $ne: false },
      });
      pagination.urlpath = "?q=" + skey + "&page=";
    } catch (error) {
      console.log(error);
      next(createError(404));
    }
  } else {
    productsList = await productData
      .find({ access: { $ne: false } })
      .skip(pagination.skip)
      .limit(pagination.limit);
    pagination.totalcount = await productData.countDocuments({
      access: { $ne: false },
    });
    pagination.urlpath = "?page=";
  }
  const user = await usersession.findById(req.session.userId);
  let cartprice = 0;
  let cartlength = 0;
  if (req.session.userId) {
    cartprice = user.cart.totalPrice;
    cartlength = user.cart.items.length;
  }

  let categories = await categoryMgtModel.find({});
  res.render("shop", {
    products: productsList,
    selectedCat,
    pagination,
    categories,
    loginaccess: user,
    cartlength,
    cartprice,
  });
};

//sessionout
const signOut = async (req, res,next) => {
  try {
    req.session.destroy();
    res.redirect("/home");
  } catch (error) {
    console.log(error);
    next(error);
  }
};

//failure of otp
const otpFail = async (req, res) => {
  res.render("Otpfail");
};

//resending of otp
const resendOtp = async (req, res) => {
  console.log(req.session.signupData.mobileno, "kitiii");
  otpHelper.sendOtp(req.session.signupData.mobileno);

  res.redirect("/otp");
};

// to add product to cart
const addToCart = async (req, res, next) => {
  try {
    let proId = req.body.id;
    let userId = req.session.userId;
    let cartUser = await User.findById({ _id: userId });
    productData
      .findById({ _id: proId })
      .then((product) => {
        cartUser.addItemToCart(product).then((result) => {
          res.json({
            success: true,
            cartprice: cartUser.cart.totalPrice,
            cartlength: cartUser.cart.items.length,
          });
        });
      })
      .catch((e) => {
        res.json({
          success: false,
          cartprice: 0,
          cartlength: 0,
        });
      });
  } catch (error) {
    next(error);
  }
};

//cartpage
const cartPage = async (req, res, next) => {
  try {
    const user = req.session.userId;
    const cartproduct = await User.findOne({ _id: user }).populate(
      "cart.items.productId"
    );
    res.render("cart", {
      cartItems: cartproduct.cart.items,
      cartTotal: cartproduct.cart.totalPrice,
      loginaccess: user,
      message:"error"
    });
  } catch (error) {
    next(error);
  }
};

//changequantity
const changeQuantity = (req, res, next) => {
  try {
    if (req.session.userId) {
      userHelpers.changeQuantity(req, res);
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    next(error);
  }
};

//wishlist
const wishListPage = async (req, res, next) => {
  try {
    if(req.session.userId){ 
    const user = req.session.userId;
    let products = [];
    let product = await User.findOne({ _id: user }).populate(
      "wishlist.items.wishlistId"
    );
    for (let i = 0; i < product.wishlist.items.length; i++) {
      if (product.wishlist.items[i].wishlistId) {
        products.push(product.wishlist.items[i]);
      }
    }
    res.render("accountwishlist", { loginaccess: user, products });
  }else{
    res.redirect('/login')
  }
  } catch (error) {
    next(error);
  }
};

//add to wishlist page
const addToWishlist = async (req, res, next) => {
  try {
    if(req.session.userId){
    let proId = req.body.id;
    let user = req.session.userId;
    let wishUser = await User.findById({ _id: user });
    productData
      .findById({ _id: proId })
      .then((result) => {
        wishUser.addWishlist(proId, (response) => {
          res.json({ success: true });
        });
      })
      .catch((e) => {
        res.json({
          success: false,
        });
      });
    }else{
      res.redirect("/login")
    }
  } catch (error) {
    next(error);
  }
};

//profile
const profilePage = async (req, res, next) => {
  try {
    if (req.session.userId) {
      let users = await User.findById(req.session.userId);
      res.render("accountprofile", {
        loginaccess: users,
        users: users,
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    next(error);
  }
};

/* user details edit */
const editUserDetails = async (req, res, next) => {
  try{
  let userId = req.session.userId;
  let phone = parseInt(req.body.phone);
  let user = await User.findOneAndUpdate(
    { _id: userId },
    {
      $set: {
        name: req.body.fullName,
        email: req.body.email,
        mobileno: phone,
      },
    },
    function (err, docs) {
      if (err) {
        console.log("Updation ERROR! " + err);
      } else {
        console.log("data updated " + docs);
      }
    }
  );
  user.save((err, data) => {
    if (err) {
      console.log("data saving ERROR! " + err);
      res.json({
        success: false
      });
    
    } else {
      res.json({
        success: true,
     
      });
      
    }
  });
}catch(error){
  console.log('ERORR!!')
  next(error);
}
};

//single view product
const viewProduct = async(req,res)=>{
  const productView = await productData.findById({_id:req.query.id})
  res.render("singleproduct",{products:productView})
  }

//add address in profile page
const addAddressPage = async(req,res,next)=>{
  try {
  let userId =req.session.userId
  let address = await Address.find({user:userId}) 
    res.render("accountaddress",{loginaccess:userId, address:address})
  } catch (error) {
    if(error){
      next(error);
    }
  }
}


//add addresss in profile
const addAddressProfile = async(req,res,next)=>{
  try {
    let address = req.body
    let addressDATA = await Address.find({_id:req.body.address})
    let addressData = Address({
      address : [address],
      user : req.session.userId
    })
    const addressPush = await addressData.save().then((result)=>{
      User.findById(req.session.userId,(err,data)=>{
        if(err){
          console.log(err)
          
        }else{
          console.log(data,"data received in @addAddressProfile")
        }
      })
    })
    if(address){
      res.redirect("/profilepage")
    }else{
      res.redirect("/cart")
    }

  } catch (error) {
    if(error){
      next(error);
    }
  }

}


//add address
const addAddress = async(req,res,next)=>{
  try {
    let address = req.body
    let addressData = Address({
      address : [address],
      user : req.session.userId
    })
    const addressPush = await addressData.save()
    if(address){
      res.redirect("/checkoutpage")
    }else{
      res.redirect("/cart")
    }

  } catch (error) {
    if(error){
      next(error);
    }
  }
}


//deletion of address
const addressDelete = async(req,res,next)=>{
  try {
    let addressDel  = await Address.findByIdAndDelete(req.query.id)
    console.log(addressDel, " adress got deleted" )
   res.json({done: true})
  } catch (error) {
    next(error);
  }
}

//page for editing address
const editAddressPage = async(req,res,next)=>{
  try {
    let address = await Address.findOne({_id:req.query.id})
    let user = req.query.id
    res.render("addressEdit",{loginaccess:user, data: address})}
 catch (error) {
  next(error);
}}

//editing of address 
const editAddress = async(req,res,next)=>{
  try{
  let userId = req.session.userId;
  await Address.findByIdAndUpdate(req.query.id, {
    $set: {
      address: {
        fullName: req.body.name,
        pincode: req.body.pincode,
        district: req.body.district,
        state: req.body.state,
        city: req.body.city,
        landmark: req.body.landmark,
      },
    },
  }).then((doc)=>{
    console.log(doc)
  }) ;
  res.redirect("/addresspage")
  
}catch(error){
  next(error);
}
};

//checkout page
const checkoutPage = async(req,res,next)=>{

  let pass = req.body
  let userId = req.session.userId
  let address = await Address.find()
  let user =  await User.findById(req.session.userId).populate('cart.items.productId')  
  try {
    res.render("checkout",{loginaccess:user,address:address})
  } catch (error) {
    next(error);
  }
}


//new order
const confirmOrder =async(req,res)=>{
  try{
  let coupon = await Coupon.findOne({code: req.body.couponRedeme })
  let userData = await User.findById(req.session.userId)
  let finalTotalPrice = userData.cart.totalPrice - coupon.discount
  if(req.body.paymentMethod === "cod"){
    const newOrderData =  new Order({
      user:req.session.userId,
      address : req.body.address,
      items: userData.cart.items,
    totalPrice :finalTotalPrice ,
      orderStat: "Placed",
      paymentMethod: req.body.paymentMethod
    })
   const orderAdded =  await newOrderData.save();
    userData.cart.items.forEach(async(eachItems)=>{
      const proId = eachItems.productId;
      await productData.findByIdAndUpdate(proId,{
        $inc:{stock: -eachItems.qty}
      })
    })
    userData.cart.items = []
    userData.cart.totalPrice = null
   let result =  await userData.save()
     
    if(result){
      res.json({ codDelivery: true })
    }else{
      console.log("error")
    }
}//online payment
else{
const newOrderData = Order({
  user:req.session.userId,
  address : req.body.address,
  items: userData.cart.items,
  totalPrice :finalTotalPrice ,
  orderStat: "Pending",
  paymentMethod: req.body.paymentMethod
})
const orderAdded = await newOrderData.save().then((doc)=>{
  const Razorpay = require("razorpay")
  var instance = new Razorpay({
    key_id: 'rzp_test_8emA6zzli6nGP1',
    key_secret: 'O4RlOXRxnLAX8IaXM3ifqFZZ'
  });
    instance.orders.create({
      amount:doc.totalPrice * 100,
      currency: "INR",
      receipt:""+ doc._id
    })
    .then((response) => {
      userData.cart.items = []
    userData.cart.totalPrice = 0
    let result =  userData.save()
      res.json({
        orderData: doc,
        user: req.session.userId,
        order: response,
      });
    });
}
)}
let UserId = await User.findById(req.session.userId)
await Coupon.findOneAndUpdate(
  { name: req.body.couponRedeme },
  { $addToSet: { usedUsers : UserId } }
)
}catch(error){
  console.log(error)
}
}


//coupons
const checkCoupon = async (req, res, next) => {
  try {
    let couponData = await Coupon.findOne({ code: req.body.promo });
    let user = await User.findOne({_id:req.session.userId})
    if (couponData) {
      let currentDate = new Date()
      let expiryDate = couponData.expiry
      if (expiryDate > currentDate ) {
        if (user.cart.totalPrice > couponData.minimum_purchase) {
          let userId = req.session.userId;
          if (couponData. claimed_users.length <= 0) {
            let couponAmount = couponData.discount;
            let couponName = couponData.code;
            res.json({ couponAvailable: true, couponAmount, couponName });
          } else {
            let isClaimed = couponData.usedUsers.findIndex(
              (element) => element.toString() === userId
            );
            if (isClaimed === -1) {
              let couponAmount = couponData.discount;
              res.json({ couponAvailable: true, couponAmount });
            } else {
              res.json({
                erro: true,
                errorMessage: "Promo Code is already Claimed",
              });
            }
          }
        } else {
          res.json({ erro: true, errorMessage: "Min Cart Amount" });
        }
      } else {
        res.json({ erro: true, errorMessage: "Coupon Expired" });
      }
    } else {
      res.json({ erro: true, errorMessage: "Enter a valid Promo Code" });
    }
  } catch (error) {
    next(error);
  }
};


//page for confirmation of order
const confirmOrderPage = (req,res,next)=>{
  try {
    res.render("checkoutcomplete")
  } catch (error) {
    next(error);
  }
}

//userMgt Page
const orderManagementPage = async(req,res,next)=>{
  try {
    let user = await User.findById(req.session.userId)
    let orders = await Order.find().populate("items.productId")
    res.render("userordermgt",{loginaccess:user,orders:orders})
  } catch (error) {
    next(error);
  }
}


//userManagement 
const cancelOrder = (req,res,next)=>{
  try {
    let user = req.session.userId
   let order =  Order.findOneAndUpdate({_id:req.body.id},{
      $set:{
        orderStat : "cancelled"
       }
    },{new:true},(err,doc)=>{
      if(err){
        console.log(err)
      }else{
        const billAmount = doc.totalPrice
        res.json({success:true})
        if(doc.paymentMethod == "online"){
           User.findByIdAndUpdate(req.session.userId,
           {
            $inc:{wallet_balance:billAmount}
           })
        }
      }
    })
  } catch (error) {
    next(error);
  }
}

//verification of payment
const verifyPayement = async (req, res, next) => {
  try {    
    let body =
    req.body['response[razorpay_order_id]']+
      "|" +
      req.body['response[razorpay_payment_id]']; 
    var crypto = require("crypto");
    var expectedSignature = crypto.createHmac('sha256', 'O4RlOXRxnLAX8IaXM3ifqFZZ')
      .update(body.toString())
      .digest("hex");
    var response = { signatureIsValid: "false" };

    if (expectedSignature.trim() === req.body['response[razorpay_signature]']) {
      response = { signatureIsValid: "true" };
      const userId = req.session.userId;
      const user = await User.findById(userId);
      user.cart.items.forEach(async (eachItems) => {
        const proId = eachItems.productId;
        await productData.findByIdAndUpdate(proId, {
          $inc: { stock: -eachItems.qty },
        });
      });
     await Order.findOneAndUpdate(
        { _id: req.body['order[receipt]']},
        { $set:
           { orderStat: "Placed" } 
        }
      );
    }
    res.json({ response: response });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  checkCoupon,
  userHome,
  userLogin,
  userSignup,
  userOtp,
  loggedIn,
  doRegister,
  otpVerification,
  shop,
  signOut,
  otpFail,
  resendOtp,
  addToCart,
  cartPage,
  changeQuantity,
  wishListPage,
  addToWishlist,
  profilePage,
  editUserDetails,
  viewProduct,
  checkoutPage,
  addAddress,
  addAddressProfile,
  addAddressPage,
  addressDelete,
  editAddressPage,
  editAddress,
  confirmOrderPage,
  confirmOrder,
  cancelOrder,
  orderManagementPage,
  verifyPayement,
 

}
