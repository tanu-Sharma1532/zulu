const express = require("express");
const { getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");
const { getNewVideos } = require("../controllers/NewVideoController");
const {  getAllSellers } = require("../controllers/SellerController");
const { getTopProductBrandsSimple } = require("../controllers/BrandsController");
const { getCategories, getPopularCategories } = require("../controllers/CategoryController");
const { sendOtp, verifyOtp } = require("../controllers/SendOtp");
const { signUpWithMobile, verifyOtpNew, sendOtp: sendOtpNew, testTwilioConfig } = require("../controllers/AuthController");
const { getUiElement  } = require("../controllers/uiElementController");
const { getAllMalls  } = require("../controllers/MallController");
 const { getOrders } = require("../controllers/getOrders");



const router = express.Router();

// Shop able videos
router.get("/get_shop_able_videos", getShopAbleVideos);

router.post("/sign-up-with-mobile", signUpWithMobile);

router.post("/verify_otp_new", verifyOtpNew);

router.post("/send_otp_new", sendOtpNew);

router.get("/test-twilio", testTwilioConfig);

router.post("/send-otp", async (req, res) => {
  const { mobile } = req.body;
  const result = await sendOtp(mobile);
  res.json(result);
});

router.post("/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  const result = verifyOtp(mobile, otp);
  res.json(result);
});

router.get("/getTopBrands", async (req, res) => {
  try {
    const brands = await getTopProductBrandsSimple(req);
    res.json(brands);
  } catch (err) {
    console.error("Error in /getTopBrands route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getCategories", async (req, res) => {
  try {
    const categories = await getCategories(req.query, req);
    res.json(categories);
  } catch (err) {
    console.error("Error in /getCategories route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getPopularCategories", async (req, res) => {
  try {
    const categories = await getPopularCategories(req);
    res.json(categories);
  } catch (err) {
    console.error("Error in /getPopularCategories route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/getProducts", getProducts);
router.get("/getNewVideos", getNewVideos);

// Categories
router.get("/getCategories", async (req, res) => {
  try {
    const {
      id,
      limit,
      offset,
      sort,
      order,
      has_child_or_item,
      slug,
      ignore_status,
      seller_id,
    } = req.query;

    const categories = await getCategories({
      id,
      limit,
      offset,
      sort,
      order,
      has_child_or_item,
      slug,
      ignore_status,
      seller_id,
    });
     req // <-- pass request

    res.json(categories);
  } catch (err) {
    console.error("Error in /getCategories route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Malls
router.get("/getallmalls", async (req, res) => {
  try {
    const { user_lat, user_lon } = req.query;
    const malls = await getAllMalls({ user_lat, user_lon });
    res.json(malls);
  } catch (err) {
    console.error("Error in /getallmalls route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Nearby Outlets
router.get("/getNearbyOutlets", async (req, res) => {
  try {
    const { page, limit, latitude, longitude, maxDistance } = req.query;
    const outlets = await getNearbyOutlets({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      maxDistance: maxDistance ? Number(maxDistance) : 15000,
    });
    res.json(outlets);
  } catch (err) {
    console.error("Error in /getNearbyOutlets route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




router.post("/getOrders", getOrders);


// UI Element
router.get("/get_ui_element", getUiElement);

// Sellers
router.get("/getAllSellers", getAllSellers);

module.exports = router;
