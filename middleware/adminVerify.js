const adminVerifyLogin=(req,res,next)=>{

    if(req.session.adminLoggedIn){
        next();
    }else{
        res.redirect("/admin/adminLogin");
    }
}
module.exports={adminVerifyLogin}