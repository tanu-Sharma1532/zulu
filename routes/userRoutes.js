const express = require("express");
const { getShopAbleVideos } = require("../controllers/VideoController");
const { getProducts } = require("../controllers/ProductController");
const { getNewVideos } = require("../controllers/NewVideoController");
const { getAllSellers } = require("../controllers/SellerController");
const {
  getTopProductBrandsSimple,
} = require("../controllers/BrandsController");
const {
  getCategories,
  getPopularCategories,
} = require("../controllers/CategoryController");
const { sendOtp, verifyOtp } = require("../controllers/SendOtp");
const {
  signUpWithMobile,
  verifyOtpNew,
  sendOtp: sendOtpNew,
  testTwilioConfig,
} = require("../controllers/AuthController");
const { getUiElement } = require("../controllers/uiElementController");
const { getAllMalls } = require("../controllers/MallController");
const { getOrders } = require("../controllers/getOrders");
const { addMembership } = require("../controllers/addMembership");
const { placeOrder, upload } = require("../controllers/PlaceOrders");
const {
  bookTour,
  updateTour,
  listOutletSlots,
  socUserBookings,
  socSellerBookings,
  socAllBookings,
  socOutletBookings,
  socOutletBookingsByDate,
} = require("../controllers/tourController");
const { newPlaceOrder } = require("../controllers/orderController");
const { getMembership } = require("../controllers/getmembershipbronze");

const N = require("../controllers/NotificationController");
const T = require("../controllers/TicketController");
const P = require("../controllers/productsController");

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

router.get("/getProducts", P.getProducts);
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
    req; // <-- pass request

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

// Membership route
router.post("/add-membership", addMembership);

// UI Element
router.get("/get_ui_element", getUiElement);

// Sellers
router.get("/getAllSellers", getAllSellers);

router.post("/place_order", upload.array("documents"), placeOrder);

router.post("/book-tour", bookTour);
router.post("/update-tour", updateTour);
router.get("/outlet-slots", listOutletSlots);
router.get("/soc-user-bookings", socUserBookings);
router.get("/soc-user-bookings/:user_id", socUserBookings);
router.get("/soc-seller-bookings", socSellerBookings);
router.get("/soc-seller-bookings/:seller_id", socSellerBookings);
router.get("/soc-all-bookings", socAllBookings);
router.get("/soc-outlet-bookings", socOutletBookings);
router.get("/soc-outlet-bookings/:society_id", socOutletBookings);
router.get("/soc-outlet-bookings-datetime", socOutletBookingsByDate);
router.get(
  "/soc-outlet-bookings-datetime/:outlet_id/:date",
  socOutletBookingsByDate
);

router.post("/newPlaceOrder", newPlaceOrder);

router.post("/place_order", upload.array("documents"), placeOrder);

router.post("/book-tour", bookTour);
router.post("/update-tour", updateTour);
router.get("/outlet-slots", listOutletSlots);
router.get("/soc-user-bookings", socUserBookings);
router.get("/soc-user-bookings/:user_id", socUserBookings);
router.get("/soc-seller-bookings", socSellerBookings);
router.get("/soc-seller-bookings/:seller_id", socSellerBookings);
router.get("/soc-all-bookings", socAllBookings);
router.get("/soc-outlet-bookings", socOutletBookings);
router.get("/soc-outlet-bookings/:society_id", socOutletBookings);
router.get("/soc-outlet-bookings-datetime", socOutletBookingsByDate);
router.get(
  "/soc-outlet-bookings-datetime/:outlet_id/:date",
  socOutletBookingsByDate
);

router.post("/newPlaceOrder", newPlaceOrder);

router.get("/getmembershipbronze", getMembership);

router.post("/notifications/send", N.sendPushNotification);
router.post("/notifications/send-to-admins", N.sendPushNotificationToAdmins);
router.post("/notifications/test", N.sendTestNotification);
router.post("/notifications/get-user-token", N.getUserFCMToken);
router.post("/notifications/update-token", N.updateFirebaseToken);
router.post("/notifications/status", N.updateNotificationStatus);
router.get("/notifications/user", N.getUserNotifications);
router.post("/notifications/admin/status", N.updateAdminNotificationStatus);
router.get("/notifications/admin", N.getAdminNotifications);
router.post("/notifications/admin-users", N.addAdminUser);
router.delete("/notifications/admin-users/:user_id", N.removeAdminUser);
router.get("/notifications/admin-users", N.listAdminUsers);

router.post("/tickets/create", T.createTicket);
router.get("/tickets", T.listTickets);
router.get("/ticket-types", T.listTicketTypes);
module.exports = router;
