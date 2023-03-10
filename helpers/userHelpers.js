const userData = require("../models/userModels");
const bcrypt = require("bcrypt");
const otpHelper = require("../util/otp");
const products = require("../models/product");
const { TrustProductsChannelEndpointAssignmentInstance } = require("twilio/dist/lib/rest/trusthub/v1/trustProducts/trustProductsChannelEndpointAssignment");
const objId = require('mongoose').Types.ObjectId;

let signup;

const doRegister = async (Data, res, req, cb) => {
  const phone = Data.mobileno;
  signup = Data;
  req.session.signupData = Data;
  otpHelper.sendOtp(phone);
  cb(true);
};

const otp = async (otp, res, cb) => {
  console.log(otp);

  let { name, email, password, confirmpassword, mobileno } = signup;
  await otpHelper.verifyOtp(mobileno, otp).then(async (verification) => {
    if (verification.status == "approved") {
      password = await bcrypt.hash(password, 10);
      confirmpassword = await bcrypt.hash(confirmpassword, 10);
      const users = new userData({
        name: name,
        email: email,
        password: password,
        confirmpassword: confirmpassword,
        mobileno: mobileno,
      });
      users
        .save()
        .then((doc) => {
          cb(doc);
        })
        .catch((e) => {
          console.log("ERROR ", e);
        });
    } else if (verification.status == "pending") {
      console.log("otp not matched");
    }
  });
};

const doLogin = async (req, res) => {
  let userlogin = req.body;
  let user = await userData.findOne({ email: req.body.email });
  if (user) {
    bcrypt.compare(userlogin.password, user.password).then((status) => {
      if (status) {
        req.session.userId = user._id;
        req.session.error = false;
        res.redirect("/home");
      } else {
        req.session.loggedIn = false;
        req.session.error = true;
        res.redirect("/login");
      }
    });
  } else {
    req.session.loggedIn = false;
    req.session.error = true;
    res.redirect("/login");
  }
};

/* here is cart page */ //userData for user-models
const cart = async (req, res) => {
  let showCategory = await category.find({ access: true });
  let users = req.session.user;
  let userId = req.session.user._id;
  let cartUser = await userData.findById(userId);
  cartUser
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      let cartItems = user.cart;
      cartCount = cartItems.items.length;
      res.render("cart", {
        user: true,
        admin: false,
        showCategory,
        users,
        cartItems,
        cartCount,
        page: "cart",
      });
    })
    .catch((e) => {
      console.log("ERROR!! " + e);
    });
};

const changeQuantity = async (req, res) => {
  try {
    let count = parseInt(req.body.count);
    let userId = req.session.userId;
    let cartUser = await userData.findById({ _id: userId });
    let proId = req.body.id;
   proId = proId.trim();
    proId = objId(proId)
     await products.findById(proId).then((data)=>{
      cartUser.changeQuantity(data, count, userId, (response) => {
        res.json(response);
      });
    })
  } catch (err) {
    console.log("ERROR....!!! " + err);
  }
};
module.exports = {
  doRegister,
  otp,
  doLogin,
  cart,
  changeQuantity,
  
};
