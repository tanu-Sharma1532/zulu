const express = require("express");
const { getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");
const { getNewVideos } = require("../controllers/NewVideoController");
const { getCategories } = require("../controllers/CategoryController");
const { getAllMalls } = require("../controllers/MallController");
const { getTopProductBrandsSimple } = require("../controllers/BrandsController");
const { getNearbyOutlets } = require("../controllers/OutletController"); 
const { sendOtp, verifyOtp } = require("../controllers/SendOtp"); 
const { getUiElement } = require("../controllers/uiElementController");
const { getAllSellers } = require("../controllers/SellerController");

const router = express.Router();

// Shop able videos
router.get("/get_shop_able_videos", getShopAbleVideos);

// Send OTP
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

// Top Brands
router.get("/getTopBrands", async (req, res) => {
  try {
    const brands = await getTopProductBrandsSimple();
    res.json(brands);
  } catch (err) {
    console.error("Error in /getTopBrands route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Products
router.get("/getProducts", getProducts);

// New Videos
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

// UI Element
router.get("/get_ui_element", getUiElement);

// Sellers
router.get("/getAllSellers", getAllSellers);

module.exports = router;
