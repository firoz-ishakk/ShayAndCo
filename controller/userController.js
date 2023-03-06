const userHelpers = require("../helpers/userHelpers");
const { response } = require("../routes/adminRoute");
const productData = require("../models/product");
const categoryMgtModel = require("../models/categoryMgtModel");
const usersession = require("../models/userModels");
const otpHelper = require("../util/otp");
const User = require("../models/userModels");
const Order = require("../models/orderModel")
const Address = require("../models/address")
const Coupon = require("../models/couponModel")

const objId = require('mongoose').Types.ObjectId;
const { findById, findByIdAndUpdate } = require("../models/userModels");
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

const userLogin = (req, res) => {
  try {
    if (req.session.userId) {
      res.redirect("/home");
    } else {
      let err = req.session.error;
      req.session.error = false;
      console.log("error: ", err);
      res.render("userLogin", { err });
    }
  } catch (err) {
    console.log("page not found");
  }
};

const userSignup = (req, res) => {
  try {
    if (req.session.loggedIn) {
      res.redirect("/home");
    }
    res.render("userSignup");
  } catch (error) {
    console.log("404 not found ", error);
  }
};

const userOtp = (req, res) => {
  try {
    res.render("userOtp");
  } catch (error) {
    console.log("page not found");
  }
};

const doRegister = (req, res) => {
  userHelpers.doRegister(req.body, res, req, (user) => {
    console.log("after signup success ");
    res.redirect("/otp");
  });
};

const loggedIn = (req, res) => {
  console.log(req.body);
  userHelpers.doLogin(req, res);
};

const otpVerification = (req, res) => {
  userHelpers.otp(req.body.otp, res, (user) => {
    req.session.loggedIn = true;

    console.log("data saved");
    res.redirect("/home");
  });
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
      console.log(pagination);
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
      console.log(error);
      next(createError(404));
    }
    typeData.type = "catlisting";
  } else if (req.query.q) {
    typeData.type = "qlisting";
    typeData.key = req.query.q.toString();

    try {
      let skey = req.query.q;
      // productsList  = await products.find({ name: { $regex: new RegExp('^'+req.query.q.toString()+'.*','i')}})
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
  // let productlisting = await productData.find({access:true}).populate("category")
  const user = await usersession.findById(req.session.userId);
  let cartprice = 0;
  let cartlength = 0;
  if (req.session.userId) {
    cartprice = user.cart.totalPrice;
    cartlength = user.cart.items.length;
    // console.log(cartlength, " over herree");
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
const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/home");
  } catch (error) {
    console.log(error);
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

/* to add product to cart */
const addToCart = async (req, res) => {
  try {
    let proId = req.body.id;
    console.log(proId, " good? good");
    console.log(req.session.userId);
    let userId = req.session.userId;
    let cartUser = await User.findById({ _id: userId });
    productData
      .findById({ _id: proId })
      .then((product) => {
        console.log("product: ", product);
        cartUser.addItemToCart(product).then((result) => {
          res.json({
            success: true,
            cartprice: cartUser.cart.totalPrice,
            cartlength: cartUser.cart.items.length,
          });
          console.log(cartUser.cart.items.length);
        });
      })
      .catch((e) => {
        console.log("ERROR!! " + e);
        res.json({
          success: false,
          cartprice: 0,
          cartlength: 0,
        });
      });
  } catch (err) {
    console.log("ERROR IN ADD TO CART!! " + err);
  }
};

//cartpage
const cartPage = async (req, res) => {
  try {
    const user = req.session.userId;

    const cartproduct = await User.findOne({ _id: user }).populate(
      "cart.items.productId"
    );
    console.log(cartproduct.cart.items, "for cart products");
    console.log(
      user,
    );
    res.render("cart", {
     
      cartItems: cartproduct.cart.items,
      cartTotal: cartproduct.cart.totalPrice,
      loginaccess: user,
      message:"error"
    });
  } catch (error) {
    console.log("error!!", error);
  }
};

//changequantity
const changeQuantity = (req, res) => {
  if (req.session.userId) {
    console.log(
      req.body,
      "naan bodyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
    );
    userHelpers.changeQuantity(req, res);
  } else {
    res.redirect("/login");
  }
};

//wishlist
const wishListPage = async (req, res) => {
  try {
    if(req.session.userId){
    console.log("wishlist....");
    const user = req.session.userId;
    // const wishlistpage = await User.findPne({_id:user})
    let products = [];
    let product = await User.findOne({ _id: user }).populate(
      "wishlist.items.wishlistId"
    );
    for (let i = 0; i < product.wishlist.items.length; i++) {
      if (product.wishlist.items[i].wishlistId) {
        products.push(product.wishlist.items[i]);
      }
    }
    console.log(products, " productssssss");
    console.log("user: ", product.wishlist.items);
    res.render("accountwishlist", { loginaccess: user, products });
  }else{
    res.redirect('/login')
  }
  } catch (error) {
    console.log("wishlist error!", error);
  }
};

//add to wishlist page
const addToWishlist = async (req, res) => {
  try {
    if(req.session.userId){
    let proId = req.body.id;
    console.log(proId, "wishlist proID");
    let user = req.session.userId;
    console.log(user);
    let wishUser = await User.findById({ _id: user });
    productData
      .findById({ _id: proId })
      .then((result) => {
        wishUser.addWishlist(proId, (response) => {
          res.json({ success: true });
        });
      })
      .catch((e) => {
        console.log("ERROR!! " + e);
        res.json({
          success: false,
        });
      });
    }else{
      res.redirect("/login")
    }
  } catch (error) {
    console.log("error in wishlist", error);
  }
};

//profile
const profilePage = async (req, res) => {
  try {
    if (req.session.userId) {
      let users = await User.findById(req.session.userId);
      console.log("profile: ", users);
      res.render("accountprofile", {
        loginaccess: users,
        users: users,
      });
    } else {
      res.redirect("/login");
    }
  } catch (e) {
    console.log("user profile ERROR! ", e);
  }
};

/* user details edit */
const editUserDetails = async (req, res) => {
  try{
  console.log("id: " + req.session.userId);
  console.log(req.body);
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
      console.log("data saving successful! " + data);
      res.json({
        success: true,
     
      });
      
    }
  });
}catch(e){
  console.log('ERORR!! ',e)
}
};

//single view product
const viewProduct = async(req,res)=>{
  const productView = await productData.findById({_id:req.query.id})
  console.log(productView , " body received")
  res.render("singleproduct",{products:productView})
  }

//add address in profile page
const addAddressPage = async(req,res)=>{
  try {
  let userId =req.session.userId
  console.log(userId)
  let address = await Address.find({user:userId}) 
    res.render("accountaddress",{loginaccess:userId, address:address})
  } catch (error) {
    if(error){
      console.log("there is an error in the address add @addAddressPage", error)
    }
  }
}


//add addresss in profile
const addAddressProfile = async(req,res)=>{
  try {
    
    console.log(req.body,"this is body for add address" ) 
    let address = req.body
    let addressDATA = await Address.find({_id:req.body.address})
    
    console.log("these are the address Datas @addAddressPage: ", addressDATA)
    let addressData = Address({
      address : [address],
      user : req.session.userId
    })
    console.log(addressData, " this is address data @addAddressProfile")
    const addressPush = await addressData.save().then((result)=>{
      console.log(result, " this is the result of adaddress @addaddressProfile")
      User.findById(req.session.userId,(err,data)=>{
        if(err){
          console.log(err)
          
        }else{
          console.log(data,"data received in @addAddressProfile")
        }
      })

      // console.log(userPush, "  user puhs happening here")
    })
    if(address){
      res.redirect("/profilepage")
    }else{
      console.log("error in sending address @addAddress" , error);
      res.redirect("/cart")
    }

  } catch (error) {
    if(error){
      console.log("there is an error in the add address part @addAddres route", error)
    }
  }

}


//add address
const addAddress = async(req,res)=>{
  try {
    console.log(req.body,"this is body for add address" ) 
    let address = req.body
    let addressData = Address({
      address : [address],
      user : req.session.userId
    })
    console.log(addressData, " this is address data  @addAddress")
    const addressPush = await addressData.save()
    console.log(addressPush, "the data is pushed to the database")
    if(address){
      res.redirect("/checkoutpage")
    }else{
      console.log("error in sending address @addAddress" , error);
      res.redirect("/cart")
    }

  } catch (error) {
    if(error){
      console.log("there is an error in the add address part @addAddres route", error)
    }
  }
}


//deletion of address
const addressDelete = async(req,res)=>{
  try {
    let addressDel  = await Address.findByIdAndDelete(req.query.id)
    console.log(addressDel, " adress got deleted" )
   res.json({done: true})
  } catch (error) {
    console.log(error, " error in deletion of address")
  }
}

//page for editing address
const editAddressPage = async(req,res)=>{
  try {
    let address = await Address.findOne({_id:req.query.id})
    let user = req.query.id
    console.log(address," req.body received at @editAddressPage")
    console.log(user," this is user @editAddressPage");
    res.render("addressEdit",{loginaccess:user, data: address})}
 catch (error) {
  console.log("edit page is in error @editAddressPage",error)
}}

//editing of address 
const editAddress = async(req,res)=>{
  try{
   console.log(req.body," this is quesrybbbbbbbbbbbbbbbbbbbbbbbbbbb")
  let userId = req.session.userId;
  // let phone = parseInt(req.body.phone);
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
    console.log(doc, "ze docccccccccccccccccc")
  }) ;
  res.redirect("/addresspage")
  
}catch(e){
  console.log('ERORR!! ',e)
}
};

//checkout page
const checkoutPage = async(req,res)=>{

  let pass = req.body
  console.log("this is req.body @checkout page ", pass)
  let userId = req.session.userId
  let address = await Address.find()
  console.log(address," this is address @checkoutPage")
  let user =  await User.findById(req.session.userId).populate('cart.items.productId')  
  console.log(user," user in checkout @checkoutpage")
  try {
    res.render("checkout",{loginaccess:user,address:address})
  } catch (error) {
    console.log("checkout page error", error)
  }
}


//new order
const confirmOrder =async(req,res)=>{
  try{
  console.log(req.body,'body ethiiiiiiiiiiiiiiiiiii')
  let coupon = await Coupon.findOne({code: req.body.couponRedeme })
  console.log(coupon," this here is coupon in @newOrder")
  let userData = await User.findById(req.session.userId)
  console.log(userData,'useerrrrr')
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
    console.log( newOrderData,'orderrrrrrrrrrrrrrrr getting');
   const orderAdded =  await newOrderData.save();
   console.log(orderAdded,'orderrrrrrrrrrrrrrrr getted');
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
      console.log("the result  for confirmation of order: is done", result)
      console.log("the order is damn confirmed")
      res.json({ codDelivery: true })
    }else{
      console.log("not confirmed? check the error")
    }
}//onine payment
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
  console.log("error in online payment", error)
}
}


//coupons
const checkCoupon = async (req, res, next) => {
  try {
    console.log("getting here");
    
    let couponData = await Coupon.findOne({ code: req.body.promo });
    let user = await User.findOne({_id:req.session.userId})
    console.log(couponData," this the the coupon data");
    
    console.log(user.cart.totalPrice - couponData.discount," this is the total cart amount")
    if (couponData) {
      let currentDate = new Date()
      let expiryDate = couponData.expiry
      if (expiryDate > currentDate ) {
        if (user.cart.totalPrice > couponData.minimum_purchase) {
          let userId = req.session.userId;
          console.log("getting here 111111");
          if (couponData. claimed_users.length <= 0) {
            console.log("getting here222222s");
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
    console.log(error.message);
    console.log(error.message);
    next(error);
  }
};


//page for confirmation of order
const confirmOrderPage = (req,res)=>{
  try {
    res.render("checkoutcomplete")
    console.log("order confirmed")
  } catch (error) {
    console.log("something wrong with the checkout, try again later")
  }
}

//userMgt Page
const orderManagementPage = async(req,res)=>{
  try {

    let user = await User.findById(req.session.userId)
    let orders = await Order.find().populate("items.productId")
    
     console.log(orders, "orders by the user @orderManagementPage")

    res.render("userordermgt",{loginaccess:user,orders:orders})
  } catch (error) {
    console.log("error in Usermgt page", error)
  }
}


//userManagement 
const cancelOrder = (req,res)=>{
  try {
    let user = req.session.userId
    console.log(user," the user is signed innnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn" );
   let order =  Order.findOneAndUpdate({_id:req.body.id},{
      $set:{
        orderStat : "cancelled"
       }
    },{new:true},(err,doc)=>{
      if(err){
        console.log("error",err)
      }else{
        
        console.log("success in cancelling the order",doc)
        const billAmount = doc.totalPrice
        console.log(billAmount, " this is the bill amount after Cancelling order ")
        res.json({success:true})
        if(doc.paymentMethod == "online"){
          console.log(req.session.userId," THIS IS THE USERiD DSKJFGNADSLKFJGNSLDKFJGNLKSDFJNGLSKDFJNGLKJDFNGLKSGN")
           User.findByIdAndUpdate(req.session.userId,
           {
            $inc:{wallet_balance:billAmount}
           })
        }
      }
    })
  } catch (error) {
    
  }
}

const verifyPayement = async (req, res, next) => {
  try {    
    let body =
    req.body['response[razorpay_order_id]']+
      "|" +
      req.body['response[razorpay_payment_id]']; 
    
  
console.log(body,'body');
    var crypto = require("crypto");
    var expectedSignature = crypto.createHmac('sha256', 'O4RlOXRxnLAX8IaXM3ifqFZZ')
      .update(body.toString())
      .digest("hex");
    console.log("sig received ", req.body['response[razorpay_signature]']);
    console.log("sig generated ", expectedSignature);
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
    console.log(req.body._id," sdkgfjbaljsbgnlkjadshgflkjafgkljashbdfglkjansdlgkjbas;dkjgfbUIWHG;OJsdnf")
     await Order.findOneAndUpdate(
        { _id: req.body['order[receipt]']},
        { $set:
           { orderStat: "Placed" } 
        }
      );
    }
    res.json({ response: response });
  } catch (error) {
    console.log("error in payment thingy");
    console.log(error.message);
    next(error);
  }
};

//cancell



//wallet
const wallet = (req,res)=>{

}


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
  wallet

}
