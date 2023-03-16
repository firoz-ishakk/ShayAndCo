const adminEmail = process.env.adEmail;
const adminPassword = process.env.adPassword;
const userDataBase = require("../models/usermodels");
const category = require("../models/categorymgtmodel");
const {
  findOne,
  findByIdAndUpdate,
  updateOne,
} = require("../models/usermodels");
const Product = require("../models/product");
const couponData = require("../models/couponmodel");

//admin login
const adminLog = (req, res) => {
  let adminLogger = req.body;
  if (req.body) {
    if (req.body.email == adminEmail) {
      if (req.body.password == adminPassword) {
        req.session.adminLoggedIn = true;
        res.redirect("/admin");
      } else {
        req.session.adminLoggedIn = false;
        req.session.loginERR = true;
        res.redirect("/admin/adminlogin");
      }
    } else {
      console.log("email not found");
    }
  } else {
    console.log("no data found");
  }
};
const adminUserData = async (req, res) => {
  let userData = await userDataBase.find();
  res.render("adminusertable", { userData });
};

//blocking of users
const UserBlock = async (req, res, next) => {
  try {
    let userBlock = req.params.id;
    userDataBase.findByIdAndUpdate(
      { _id: userBlock },
      { access: false },
      { new: true },
      (err, doc) => {
        if (err) {
          res.json({ status: false });
        } else {
          res.json({ status: true, access: doc.access });
        }
      }
    );
  } catch (error) {
    error.admin = true
    next(error)
  }
};




//unblocking of users
const UserUnblock = async (req, res,next) => {
  try {
    let userUnBlock = req.params.id;
    userDataBase.findByIdAndUpdate(
      { _id: userUnBlock },
      { access: true },
      { new: true },
      (err, doc) => {
        if (err) {
          res.json({ status: true });
        } else {
          res.json({ status: false, access: doc.access });
        }
      }
    );
  } catch (error) {
    error.admin = true
    next(error)
  }
};

//addition of categories
//schema name is "category"
const addcategory = (req, res) => {
  let title = req.body.categoryname;
  let image = req.files.image;

  const path = image[0].path.substring(6);
  let description = req.body.categorydescription;
  const admincategory = new category({
    title: title,
    image: path,
    description: description,
  });
  admincategory.save().then((result) => {
    res.redirect("/admin/category");
  }).catch((err) => {
    if (err.code === 11000) {
      req.flash("err", "! Duplicate value !");
      res.redirect("/admin/newcategory");
    } else {
      req.flash("categoryAddErr", "! FILL DATA !");
      res.redirect("/admin/newcategory");
    }
  });
};

//category edit
const editCategory = (req, res, id,next) => {
  const categoryId = req.params.id;
  try {
    let image = req.files.image;
    let path;
    const update = req.body;
    if (image.length >= 0) {
      let path = image[0].path.substring(6);
      update.image = path;
    }
    category.findByIdAndUpdate(categoryId, update).then((results) => {
      if (!results) {
        res.redirect("/admin/");
      } else {
        res.redirect("/admin/category");
      }
    });
  } catch (error) {
    var id = req.session.edId;
    req.flash(error, "invalid input");
    res.redirect(`/admin/editcategory?id=${id}`);
    error.admin = true
    next(error)
  }
};

//editing of products 
const editProd = async(req, res,next) => {
  let proId = req.query.id;

  try {  
    let image = req.files.productImage
    let path = []
    const update = req.body;
    if(image.length >= 0) {
      for(i=0; i<image.length;i++){
       path.push(image[i].path.substring(6)) 
    }
    update.images = path
  }
    Product.findByIdAndUpdate(proId, update,{new:true}).then((results) => {
      if (!results) {
        res.redirect("/admin/producteditpage");
      } else {
        res.redirect("/admin/productmgt");
      }
    });
  } catch (error) {
    var id = req.session.edId;
    req.flash(error, "invalid input");
    res.redirect(`/admin/editcategory?id=${id}`);
    error.admin = true
    next(error)
  }
};

//for category deletion
const deleteCategory = async (req, res) => {
  let deleteId = req.query.id;
  await category.findByIdAndDelete(deleteId);
  res.json({ delete: true });
};

//addition of a product
const addproduct = (req, res, next) => {
  try {
    let brand = req.body.brandname;
    let title = req.body.title;
    let description = req.body.description;
    let price = req.body.price;
    let category = req.body.category;
    let stock = req.body.stock
    let image = req.files.productImage;
    const path = [];
    image.forEach((el) => {
      path.push(el.path.substring(6));
    });
    const product = new Product({
      brand: brand,
      price: price,
      title: title,
      images: path,
      category: category,
      stock : stock,
      description: description,
    });
    product
      .save()
      .then((result) => {
        res.redirect("/admin/productmgt");
      })
      .catch((err) => {
        console.log(err);
        
      });    
  } catch (error) {
    error.admin = true
    next(error)
  }
};

//listing and unlisting item
const prodList = async (req, res, next) => {
  try {
    let listId = req.params.id;
    Product.findByIdAndUpdate(
      listId,
      { access: false },
      { new: true },
      (err, doc) => {
        if (err) {
          console.log(err);
        } else {
          res.redirect("/admin/productmgt");
        }
      }
    );
  } catch (error) {
    error.admin = true
    next(error)
  }
};

const prodUnlist = async (req, res,next) => {
  try {
    const unlistId = req.params.id;
    await Product.findByIdAndUpdate(
      { _id: unlistId },
      { access: true },
      { new: true },
      (err, doc) => {
        if (err) {
          console.log(" unlisting unsuccessful", err);
        } else {
          res.redirect("/admin/productmgt");
        }
      }
    );
  } catch (error) {
    error.admin = true
    next(error)
  }
};
//adding coupon
const addcoupon = (req, res, next) => {
  try {
    let discount = parseInt(req.body.discount)
    let minimum_purchase = parseInt(req.body.couponmin)
    let user_allowed = parseInt(req.body.couponmax)
    let code = String(req.body.couponcode)
    code = code
    const newCoupon = new couponData({
      
        code: code,
        status: req.body.status,
        user_allowed: user_allowed,
        minimum_purchase: minimum_purchase,
        claimed_users: req.body.claimed_users,
        last_update: req.body.last_update,
        expiry: req.body.expiry,
        discount: discount
      
    });
    newCoupon.save((error) => {
      if (error) {
        console.log(error);
      } else {
        res.redirect("/admin/coupon")
      }
    });
  } catch (error) {
    error.admin = true
   next(error)
  }
};

//editing of coupons
const couponEdit = async(req,res,next)=>{
try {
  let body = req.body
  let edit = req.query.id
  await couponData.findByIdAndUpdate(edit,{
    $set:{
      code:req.body.code, 
      user_allowed:req.body.user_allowed,
      minimum_purchase:req.body.minimum_purchase,
      discount:req.body.discount,
      expiry:req.body.expiry
    }
  }).then((results)=>{
    if(!results){
      res.redirect("/admin/coupon")
    }
    else{
      res.redirect("/admin/coupon")
    }
  })
} catch (error) {
  error.admin = true
  next(error)
}
  
}

module.exports = {
  adminLog,
  adminUserData,
  UserBlock,
  UserUnblock,
  addcategory,
  editCategory,
  deleteCategory,
  addproduct,
  prodList,
  prodUnlist,
  addcoupon,
  couponEdit,
  editProd
};
