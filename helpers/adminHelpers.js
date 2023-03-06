const adminEmail = process.env.adEmail;
const adminPassword = process.env.adPassword;
const userDataBase = require("../models/userModels");
const category = require("../models/categoryMgtModel");
const {
  findOne,
  findByIdAndUpdate,
  updateOne,
} = require("../models/userModels");
const Product = require("../models/product");
const couponData = require("../models/couponModel");

//admin login
const adminLog = (req, res) => {
  let adminLogger = req.body;
  console.log(adminLogger);
  if (req.body) {
    if (req.body.email == adminEmail) {
      if (req.body.password == adminPassword) {
        req.session.adminLoggedIn = true;
        console.log("admin login success");
        res.redirect("/admin");
      } else {
        req.session.adminLoggedIn = false;
        req.session.loginERR = true;
        console.log("login failed");
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

  res.render("adminUserTable", { userData });
};

//blocking of users
const UserBlock = async (req, res) => {
  console.log(req.params.id);
  let userBlock = req.params.id;
  userDataBase.findByIdAndUpdate(
    { _id: userBlock },
    { access: false },
    { new: true },
    (err, doc) => {
      if (err) {
        console.log(err);
        res.json({ status: false });
      } else {
        console.log("user blocked");
        console.log(doc);
        res.json({ status: true, access: doc.access });
        /* res.redirect("/admin/adminuserdata"); */
      }
    }
  );
};




//unblocking of users
const UserUnblock = async (req, res) => {
  console.log(req.params.id);
  let userUnBlock = req.params.id;
  userDataBase.findByIdAndUpdate(
    { _id: userUnBlock },
    { access: true },
    { new: true },
    (err, doc) => {
      if (err) {
        console.log(err);
        res.json({ status: true });
      } else {
        console.log("user unblocked");
        console.log(doc);
        res.json({ status: false, access: doc.access });
        // res.redirect("/admin/adminuserdata");
      }
    }
  );
};

//addition of categories
//schema name is "category"
const addcategory = (req, res) => {
  console.log(req.files);
  let title = req.body.categoryname;
  let image = req.files.image;

  const path = image[0].path.substring(6);
  console.log(path);
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
const editCategory = (req, res, id) => {
  const categoryId = req.params.id;
  try {
    let image = req.files.image;
    let path;

    console.log(categoryId);
    const update = req.body;
    console.log(update);
    if (image.length >= 0) {
      let path = image[0].path.substring(6);
      update.image = path;
    }
    category.findByIdAndUpdate(categoryId, update).then((results) => {
      if (!results) {
        console.log("not wrking");
        res.redirect("/admin/");
      } else {
        res.redirect("/admin/category");
      }
    });
  } catch (error) {
    var id = req.session.edId;
    console.log("error!!!!!");
    req.flash(error, "invalid input");
    res.redirect(`/admin/editcategory?id=${id}`);
  }
};

//editing of products 
const editProd = async(req, res) => {
  let proId = req.query.id;

  try {
   
    let image = req.files.productImage
    console.log(image,"this is images @editprod" )
    let path = []


    const update = req.body;
  
    if(image.length >= 0) {
      for(i=0; i<image.length;i++){
       path.push(image[i].path.substring(6)) 
      // update.image[0] = path;
    }
    update.images = path
  }
    console.log(update, "edditing of product @proId");
    Product.findByIdAndUpdate(proId, update,{new:true}).then((results) => {
      if (!results) {
        console.log("not wrking");
        res.redirect("/admin/producteditpage");
      } else {
        console.log(results,'end result');
        res.redirect("/admin/productmgt");
      }
    });
  } catch (error) {
    var id = req.session.edId;
    console.log("error!! @editProd",error);
    req.flash(error, "invalid input");
    res.redirect(`/admin/editcategory?id=${id}`);
  }
};






//for category deletion
const deleteCategory = async (req, res) => {
  let deleteId = req.query.id;
  console.log(deleteId);
  await category.findByIdAndDelete(deleteId);
  res.json({ delete: true });
};

//addition of a product
const addproduct = (req, res) => {
  console.log(req.body);
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

  console.log(path, "hiiiiii");
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
      console.log("success ", result);
      res.redirect("/admin/productmgt");
    })
    .catch((err) => {
      console.log("ERROR!! ", err);
      
    });
};

//listing and unlisting item
const prodList = async (req, res) => {
  let listId = req.params.id;
  console.log(listId, " id is available");

  Product.findByIdAndUpdate(
    listId,
    { access: false },
    { new: true },
    (err, doc) => {
      if (err) {
        console.log(err);
      } else {
        console.log("listing successful");
        console.log(doc);
        res.redirect("/admin/productmgt");
      }
    }
  );
};

/* await Product.findByIdAndUpdate(req.params.id,{access:true})
res.redirect("/admin/productmgt") */

const prodUnlist = async (req, res) => {
  try {
    const unlistId = req.params.id;
    console.log(unlistId, "id is available????");
    await Product.findByIdAndUpdate(
      { _id: unlistId },
      { access: true },
      { new: true },
      (err, doc) => {
        if (err) {
          console.log(" unlisting unsuccessful", err);
        } else {
          console.log("unlisitng successful");
          console.log(doc);
          res.redirect("/admin/productmgt");
        }
      }
    );
  } catch (e) {
    console.log("error!! ", e);
  }
};
//adding coupon
const addcoupon = (req, res) => {
  console.log(req.body)
  let discount = parseInt(req.body.discount)
  let minimum_purchase = parseInt(req.body.couponmin)
  let user_allowed = parseInt(req.body.couponmax)
  let code = String(req.body.couponcode)
  code = code
  console.log(code, "this is cide")
  const newCoupon = new couponData({
    
      code: code,
      status: req.body.status,
      user_allowed: user_allowed,
      minimum_purchase: minimum_purchase,

      claimed_users: req.body.claimed_users,
      last_update: req.body.last_update,
      // last_updated_user: req.body.last_updated_user
      expiry: req.body.expiry,
      discount: discount
    
  });
  newCoupon.save((error) => {
    if (error) {
      console.log("error in coupon data", error);
    } else {
      console.log("success for coupon data");
      res.redirect("/admin/coupon")
    }
  });
};

//editing of coupons
const couponEdit = async(req,res)=>{
  let body = req.body.id
  console.log(body," this is editing body");
  let edit = req.query.id
  couponData.findByIdAndUpdate({
    edit
  }).then((results)=>{
    if(!results){
      console.log("editing coupons not working")
      res.redirect("/admin/coupon")
    }
    else{
      res.reditect("/admin/coupon")
    }
  })
  
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
