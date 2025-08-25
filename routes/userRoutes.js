const express = require("express");
const {getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");
const { getNewVideos } = require("../controllers/NewVideoController");
const {  getAllSellers } = require("../controllers/SellerController");

const router = express.Router();

router.get("/get_shop_able_videos", getShopAbleVideos);





router.post("/send-otp", async (req, res) => {
  const { mobile } = req.body;
  const result = await sendOtp(mobile);
  res.json(result);
});

// Verify OTP
router.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  const result = verifyOtp(mobile, otp);
  res.json(result);
});


router.get("/getTopBrands", async (req, res) => {
  try {
    const brands = await getTopProductBrandsSimple();
    res.json(brands);
  } catch (err) {
    console.error("Error in /getTopBrands route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});



router.get("/getProducts", getProducts);getNewVideos
router.get("/getNewVideos", getNewVideos);
router.get("/getAllSellers", getAllSellers);

module.exports = router;
