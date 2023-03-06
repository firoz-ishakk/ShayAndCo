const { render } = require("../routes/adminRoute");
const adminHelpers = require("../helpers/adminHelpers");
const category = require("../models/categoryMgtModel");
const {
  NetworkContextImpl,
} = require("twilio/dist/lib/rest/supersim/v1/network");
const productData = require("../models/product");
const { update } = require("../models/userModels");
const couponData = require("../models/couponModel");
const Order = require("../models/orderModel");
const User = require("../models/userModels")

//admin login
const adminLogin = (req, res) => {
  try {
    if (req.session.adminLoggedIn) {
      res.redirect("/admin");
    } else {
      let error = req.session.loginERR;
      req.session.loginERR = false;
      res.render("adminLogin", { error });
    }
  } catch (error) {
    console.log("404 error");
  }
};

//logged admin
const adminLogged = (req, res) => {
  try {
    adminHelpers.adminLog(req, res);
  } catch (error) {
    console.log("no page to show error 404 ", error);
  }
};

//admin main menu
const dashboard = async(req, res) => {

  if (req.session.adminLoggedIn) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
  
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    let successOrders = await Order
    .find({ order_status: "completed" })
    .sort({ ordered_date: -1 })
    .limit(15);
  let salesChartDt = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

    res.render("adminHome",{
      admin: true,
      successOrders,
      salesChartDt
    });

  } else {
    res.redirect("/admin/adminlogin");
  }
};


//admin user datas
const adminUserData = (req, res) => {
  try {
    adminHelpers.adminUserData(req, res);
  } catch (error) {
    console.log("no data found");
  }
};

//user block and unblock
const UserBlock = (req, res) => {
  adminHelpers.UserBlock(req, res);
};

const userUnBlock = (req, res) => {
  console.log("unblocked");
  adminHelpers.UserUnblock(req, res);
};

//admin category page
const adminCategory = async (req, res) => {
  try {
    if (req.session.adminLoggedIn) {
      let categoryData = await category.find();
      res.render("admincategory", { categoryData });
    } else {
      res.redirect("/admin/adminlogin");
    }
  } catch (error) {
    console.log("404 not found");
  }
};

//displaying of category pg
const newCategory = (req, res) => {
  const err = req.flash("err");
  res.render("adminaddcategory", {
    categoryAddErr: req.flash("categoryAddErr"),
    err,
  });
};

//addition of categories
const addcategory = (req, res) => {
  adminHelpers.addcategory(req, res);
};

//editing of categories
const editCategory = async (req, res, id) => {
  var id = req.query.id;
  req.session.edId = id;
  console.log(id);
  const edit = await category.findById(id);
  console.log(edit);
  const error = req.flash("error");
  res.render("admineditcategory", { id: id, error, edit });
};

//updation of categories
const updateCategory = (req, res) => {
  adminHelpers.editCategory(req, res);
};

//deletion of category
const deleteCategory = (req, res) => {
  adminHelpers.deleteCategory(req, res);
};

//admin products thingy
const productManagement = async (req, res) => {
  const products = await productData.find().populate("category");
  console.log(products);
  res.render("adminproductmgt", { products });
};

//admin addition of products
const addproduct = (req, res) => {
  adminHelpers.addproduct(req, res);
};

const addGetProduct = async (req, res) => {
  
  const categories = await category.find();
  console.log("categories: ", categories);
  res.render("productmgtadd", { categories });
};

//listing and unlisting a product
const listingProd = (req, res) => {
  console.log("listing processing..");
  adminHelpers.prodList(req, res);
};

const unlistingProd = (req, res) => {
  console.log("Unlisting processing..");
  adminHelpers.prodUnlist(req, res);
};

//editing area for products
const prodEdit = async (req, res) => {
  console.log(req.query.id);
  let proid = req.query.id;
  let products = await productData.findById(proid).populate("category");
  let categories = await category.find({ access: true });
  console.log(products);
  res.render("adminproductedit", { products, categories });
};
const productEdit = (req, res) => {
  console.log("editing working..");
  adminHelpers.editProd(req, res);
};

//coupon page
const couponPage = async (req, res) => {
  try {
    let couponDetails = await couponData.find();
    console.log(couponDetails, "this is coupon details");
    res.render("admincoupon", { couponDetails });
  } catch (error) {
    console.log("no coupon inout page", error);
  }
};

//adding coupon page
const addCouponPage = async (req, res) => {
  let couponDetails = await couponData.find();
  console.log(couponDetails, "this is coupon details");
  try {
    res.render("addcoupon");
  } catch (error) {
    console.log("error in adding coupon", error);
  }
};
//functions for addition of coupons
const addCoupon = (req, res) => {
  try {
    adminHelpers.addcoupon(req, res);
  } catch (error) {
    console.log("error in adding coupon", error);
  }
};

//coupon editing page
const couponEditPage = (req, res) => {
  console.log(req.params.id, " query got passed");
  try {
    res.render("couponedit");
  } catch (error) {
    console.log("error in loading edit page", error);
  }
};

//editing of coupons
const couponEdit = (req, res) => {
  try {
    adminHelpers.couponEdit(req, res);
  } catch (error) {
    console.log("editing error occured:", error);
  }
};

//order management page
const orderManagmentPage = async (req, res) => {
  try {
    let order = await Order.find().populate("items.productId");
    console.log(
      order[0].items[0].productId,
      " this are the order @orderManagementPage"
    );
    res.render("adminordermgt", { order: order });
  } catch (error) {
    console.log("error in rendering order mgt page", error);
  }
};

//cancelling of orders
const cancelOrder = async (req, res, next) => {
  try {
    const orderData = await Order.findByIdAndUpdate(req.query.id, {
      $set: { orderStat: req.query.status },
    });

    console.log(orderData, " the order is cancelled");
    res.redirect("/admin/ordermanagementpage");
  } catch (error) {
    console.log("error in cancelling of order", error.message);
  }
};

//changin of status
const changeOrderStatus = (req, res) => {
  console.log("calling..");
  console.log(req.body.orderId);
  try {
    Order.findOneAndUpdate(
      { _id: req.body.orderId },
      {
        $set: { orderStat: req.body.status },
      },
      { new: true },
      (err, doc) => {
        if (err) {
          console.log(err);
        } else {
          console.log(doc);
          res.json({ success: true });
        }
      }
    );
  } catch (error) {
    console.log(error.message);
    console.log("error in changing of order", error.message);
  }
};

//report
const report = async(req,res)=>{
  try {
    let user = await User.find()
    let order = await Order.find({orderStat:"Delivered"}).populate("user")
    console.log(user," this is the user detailssssssssssssssssssssssssssssssssssssssssssss")
    console.log(order, "these are the order detailssssssfgdxhgffuguyfuytfkjgfiyt");
    const total = await Order.aggregate([
        {
          $group:
          {
           _id:null,
           total: { $sum: "$totalPrice" }
       }}
    ])
     
    res.render("report",{order:order,total})
  } catch (error) {
    console.log("error in loading report page", error)
  }
}




module.exports = {
  adminLogin,
  adminLogged,
  dashboard,
  adminUserData,
  UserBlock,
  userUnBlock,
  adminCategory,
  newCategory,
  addcategory,
  updateCategory,
  editCategory,
  deleteCategory,
  productManagement,
  addproduct,
  addGetProduct,
  listingProd,
  unlistingProd,
  prodEdit,
  productEdit,
  couponPage,
  addCouponPage,
  addCoupon,
  couponEdit,
  couponEditPage,
  orderManagmentPage,
  cancelOrder,
  changeOrderStatus,
  report,
 

};
