const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const upload = multer({ dest: "uploads/" });

async function placeOrder(req, res) {
  try {
    const body = req.body;

    // Basic validation
    if (!body.product_variant_id || !body.quantity || !body.final_total || !body.payment_method) {
      return res.json({ error: true, message: "Missing required fields", data: [] });
    }

    // Handle comma-separated or single values
    const productVariantIds = body.product_variant_id.toString().split(",").map(Number);
    const quantities = body.quantity.toString().split(",").map(Number);
    const productNames = (body.product_name ? body.product_name.toString().split(",") : []).map(String);
    const variantNames = (body.variant_name ? body.variant_name.toString().split(",") : []).map(String);
    const prices = (body.price ? body.price.toString().split(",") : []).map(Number);
    const discountedPrices = (body.discounted_price ? body.discounted_price.toString().split(",") : []).map(Number);
    const taxPercents = (body.tax_percentage ? body.tax_percentage.toString().split(",") : []).map(Number);
    const taxAmounts = (body.tax_amount ? body.tax_amount.toString().split(",") : []).map(Number);
    const discounts = (body.discount ? body.discount.toString().split(",") : []).map(Number);

    // Handle attachments
    let attachments = [];
    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const newPath = path.join(__dirname, "..", "uploads", file.originalname);
        fs.renameSync(file.path, newPath);
        attachments.push(newPath);
      }
    }

    // Insert into orders table with defaults
    const orderData = {
      user_id: body.user_id || 0,
      mobile: body.mobile || null,
      email: body.email || null,
      total: body.total || 0,
      total_payable: body.total || 0,
      delivery_charge: body.delivery_charge || 0,
      final_total: body.final_total || 0,
      promo_code: body.promo_code || null,
      payment_method: body.payment_method,
      address_id: body.address_id || null,
      delivery_date: body.delivery_date || null,
      delivery_time: body.delivery_time || null,
      notes: body.order_note || null,
      attachments: JSON.stringify(attachments || []),
      status: body.status || "received",
      stage: body.stage || "new",
      status_progress: body.status_progress || "0",
      is_pos_order: body.is_pos_order !== undefined ? body.is_pos_order : 1,
      delivery_text: body.delivery_text || "",
      gift_product_id: body.gift_product_id || null,
      gift_variant_id: body.gift_variant_id || null,
      new_payment_status: body.new_payment_status || "pending",
      new_total_price: body.new_total_price || body.final_total || 0,
      rider_name: body.rider_name || "",
      rider_user_id: body.rider_user_id || 0,
      redeemed_points: body.redeemed_points || 0,
      order_type: body.order_type || "regular",
      invoice_pdf: body.invoice_pdf || null
    };

    const [orderResult] = await pool.query("INSERT INTO orders SET ?", [orderData]);
    const orderId = orderResult.insertId;

    // Insert into order_items
    for (let i = 0; i < productVariantIds.length; i++) {
      const qty = quantities[i] || 1;
      const price = prices[i] || 0;
      const discountedPrice = discountedPrices[i] || price;
      const taxPercent = taxPercents[i] || 0;
      const taxAmount = taxAmounts[i] || 0;
      const discount = discounts[i] || 0;

      const subTotal = qty * discountedPrice;

      const itemData = {
        user_id: body.user_id || 0,
        order_id: orderId,
        seller_id: body.seller_id || 0,
        product_variant_id: productVariantIds[i],
        product_name: productNames[i] || null,
        variant_name: variantNames[i] || null,
        quantity: qty,
        price: price,
        discounted_price: discountedPrice,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        discount: discount,
        sub_total: subTotal,
        status: "received",
        active_status: "awaiting",
        is_credited: 0,
        otp: 0
      };

      await pool.query("INSERT INTO order_items SET ?", [itemData]);
    }

    // Insert transaction
    const txnId = Math.floor(10000000 + Math.random() * 90000000);
    const transactionData = {
      order_id: orderId,
      user_id: orderData.user_id,
      type: body.payment_method,
      amount: body.final_total,
      status: "awaiting",
      txn_id: txnId,
      message: "awaiting"
    };
    await pool.query("INSERT INTO transactions SET ?", [transactionData]);

    return res.json({
      error: false,
      message: "Order placed successfully",
      data: { order_id: orderId, transaction_id: txnId }
    });

  } catch (err) {
    console.error(err);
    return res.json({ error: true, message: err.message, data: [] });
  }
}

module.exports = { placeOrder, upload };
