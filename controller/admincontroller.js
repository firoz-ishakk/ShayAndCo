const { render } = require("../routes/adminroute");
const adminHelpers = require("../helpers/adminhelpers");
const category = require("../models/categorymgtmodel");
const {
  NetworkContextImpl,
} = require("twilio/dist/lib/rest/supersim/v1/network");
const productData = require("../models/product");
const { update } = require("../models/usermodels");
const couponData = require("../models/couponmodel");
const Order = require("../models/ordermodel");
const User = require("../models/usermodels")

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
const dashboard = async(req, res, next) => {
try {
  

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
}
 catch (error) {
  error.admin = true
  next(error)
}
}


//admin user datas
const adminUserData = (req, res,next) => {
  try {
    adminHelpers.adminUserData(req, res);
  } catch (error) {
    console.log("no data found");
    error.admin = true
  next(error)
  }
};

//user block and unblock
const UserBlock = (req, res,next) => {
  try {
    adminHelpers.UserBlock(req, res);
    
  } catch (error) {
  error.admin = true
  next(error)
  }
};

const userUnBlock = (req, res,next) => {
  try {
    console.log("unblocked");
    adminHelpers.UserUnblock(req, res);
    
  } catch (error) {
    error.admin = true
  next(error)
  }
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
    error.admin = true
    next(error)
  }
};

//displaying of category pg
const newCategory = (req, res) => {
  try {
    
    const err = req.flash("err");
    res.render("adminaddcategory", {
      categoryAddErr: req.flash("categoryAddErr"),
      err,
    });
  } catch (error) {
    error.admin = true
    next(error)
  }
};

//addition of categories
const addcategory = (req, res,next) => {
  try {
    adminHelpers.addcategory(req, res);
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//editing of categories
const editCategory = async (req, res, id) => {
  try {
    var id = req.query.id;
    req.session.edId = id;
    console.log(id);
    const edit = await category.findById(id);
    console.log(edit);
    const error = req.flash("error");
    res.render("admineditcategory", { id: id, error, edit });
    
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//updation of categories
const updateCategory = (req, res,next) => {
  try {
    adminHelpers.editCategory(req, res);
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//deletion of category
const deleteCategory = (req, res,next) => {
  try {
    adminHelpers.deleteCategory(req, res);
  } catch (error) {
    error.admin = true
    next(error)
  }
};

//admin products thingy
const productManagement = async (req, res,next) => {
  try {
    const products = await productData.find().populate("category");
    console.log(products);
    res.render("adminproductmgt", { products });  
  } catch (error) {
    error.admin = true
    next(error)
  }
};

//admin addition of products
const addproduct = (req, res,next) => {
  try {
    adminHelpers.addproduct(req, res);
    
  } catch (error) {
    error.admin = true
  next(error)
  }
};

const addGetProduct = async (req, res,next) => {
  try {
    const categories = await category.find();
    console.log("categories: ", categories);
    res.render("productmgtadd", { categories });
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//listing and unlisting a product
const listingProd = (req, res,next) => {
  try {
    console.log("listing processing..");
    adminHelpers.prodList(req, res);
  } catch (error) {
    error.admin = true
  next(error)
  }
};

const unlistingProd = (req, res,next) => {
  try {
    console.log("Unlisting processing..");
    adminHelpers.prodUnlist(req, res);
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//editing area for products
const prodEdit = async (req, res,next) => {
  try {
    console.log(req.query.id);
    let proid = req.query.id;
    let products = await productData.findById(proid).populate("category");
    let categories = await category.find({ access: true });
    console.log(products);
    res.render("adminproductedit", { products, categories });
  } catch (error) {
    error.admin = true
  next(error)
  }
};

const productEdit = (req, res) => {
  try {
    console.log("editing working..");
    adminHelpers.editProd(req, res);
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//coupon page
const couponPage = async (req, res,next) => {
  try {
    let couponDetails = await couponData.find();
    console.log(couponDetails, "this is coupon details");
    res.render("admincoupon", { couponDetails });
  } catch (error) {
    console.log("no coupon inout page", error);
    error.admin = true
    next(error)
  }
};

//adding coupon page
const addCouponPage = async (req, res,next) => {
  let couponDetails = await couponData.find();
  console.log(couponDetails, "this is coupon details");
  try {
    res.render("addcoupon");
  } catch (error) {
    console.log("error in adding coupon", error);
  error.admin = true
  next(error)
  }
};
//functions for addition of coupons
const addCoupon = (req, res,next) => {
  try {
    adminHelpers.addcoupon(req, res);
  } catch (error) {
    console.log("error in adding coupon", error);
    error.admin = true
  next(error)
  }
};

//coupon editing page
const couponEditPage = async(req, res,next) => {
  console.log(req.query.id, " query got passed");
  let userData = await couponData.findById(req.query.id)
  try {
    res.render("couponedit",{userData});
  } catch (error) {
    if(error){
      console.log("error in loading edit page", error);
      error.admin = true
     next(error)
    }
  }
};

//editing of coupons
const couponEdit =async(req, res,next) => {
  try {
    
    // let coupon = await couponData.findById(_id,req.query.id)
    // console.log(coupon," coupppppppooooonnnnn eDDDiit")
    adminHelpers.couponEdit(req, res);
  } catch (error) {
    console.log("editing error occured:", error);
    error.admin = true
  next(error)
  }
};

//order management page
const orderManagmentPage = async (req, res,next) => {
  try {
    let order = await Order.find().populate("items.productId");
    res.render("adminordermgt", { order: order });
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//cancelling of orders
const cancelOrder = async (req, res, next) => {
  try {
    const orderData = await Order.findByIdAndUpdate(req.query.id, {
      $set: { orderStat: req.query.status },
    });
    res.redirect("/admin/ordermanagementpage");
  } catch (error) {
    error.admin = true
  next(error)
  }
};

//changin of status
const changeOrderStatus = (req, res,next) => {
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
    error.admin = true
    next(error)
  }
};

//report
const report = async(req,res,next)=>{
  try {
    let user = await User.find()
    let order = await Order.find({orderStat:"Delivered"}).populate("user")     
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
    error.admin = true
    next(error)
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
