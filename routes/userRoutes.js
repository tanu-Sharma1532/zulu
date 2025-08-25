const express = require("express");
const {getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");

const router = express.Router();

router.get("/get_shop_able_videos", getShopAbleVideos);
router.get("/getProducts", getProducts);

module.exports = router;
