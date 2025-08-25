const express = require("express");
const {getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");
const { getNewVideos } = require("../controllers/NewVideoController");
const {  getAllSellers } = require("../controllers/SellerController");

const router = express.Router();

router.get("/get_shop_able_videos", getShopAbleVideos);
router.get("/getProducts", getProducts);getNewVideos
router.get("/getNewVideos", getNewVideos);
router.get("/getAllSellers", getAllSellers);

module.exports = router;
