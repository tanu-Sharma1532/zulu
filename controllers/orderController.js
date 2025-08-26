const pool = require("../config/db");

async function newPlaceOrder(req, res) {
  try {
    if (!(await verifyToken(req))) {
      return res.json({ error: true, message: "Unauthorized" });
    }

    const b = req.body || {};

    if (!b.user_id) {
      return res.json({
        error: true,
        message: "Please select the customer!",
        data: [],
      });
    }

    const product_variant_id = parseMaybeCSV(b.product_variant_id);
    const quantityCSV =
      typeof b.quantity === "string"
        ? b.quantity
        : Array.isArray(b.quantity)
        ? b.quantity.join(",")
        : "";
    const quantity = parseMaybeCSV(quantityCSV);

    const user_id = Number(b.user_id);
    const seller_id = b.seller_id ?? "";

    const userMobileRows = await fetch_details(
      "users",
      { id: user_id },
      "mobile"
    );
    const mobile = userMobileRows?.[0]?.mobile ?? "";

    const place_order_data = {
      product_variant_id,
      quantity: quantityCSV,
      modes: b.modes ?? "",
      locations: b.locations ?? "",
      sub_locations: b.sub_locations ?? "",
      location_status: b.location_status ?? "",
      trial_prices: b.trial_prices ?? "",
      user_id,
      mobile,
      is_wallet_used: 0,
      delivery_charges: b.delivery_charges ?? 0,
      delivery_charge: b.delivery_charge ?? b.delivery_charges ?? 0,
      discount: b.discount ?? 0,
      is_delivery_charge_returnable: 0,
      wallet_balance_used: 0,
      active_status: "received",
      is_pos_order: 1,
      new_payment_type: b.new_payment_type ?? "",
      new_shipping_type: b.new_shipping_type ?? "",
      new_payment_status: b.new_payment_status ?? "",
      new_shipping_status: b.new_shipping_status ?? "",
      new_discount: b.new_discount ?? 0,
      promo_discount: b.promo_discount ?? 0,
      promo_code: b.promo_code ?? "",
      new_shipping_price: b.new_shipping_price ?? 0,
      new_total_price: b.new_total_price ?? 0,
      payment_ref_id: b.payment_ref_id ?? "",
      payment_ref_picture: b.payment_ref_picture ?? "",
      shopping_details_1: b.shopping_details_1 ?? "",
      shopping_details_2: b.shopping_details_2 ?? "",
      shopping_details_3: b.shopping_details_3 ?? "",
      shopping_details_4: b.shopping_details_4 ?? "",
      new_order_type: b.new_order_type ?? "",
      rider_name: b.rider_name ?? "",
      rider_user_id: b.rider_user_id ?? 0,
      employee_name: b.employee_name ?? "",
      employee_user_id: b.employee_user_id ?? 0,
      loyalty_given: b.loyalty_given ?? 0,
      loyalty_amount: b.loyalty_amount ?? 0,
      p_status: b.p_status ?? "",
      loyalty_transaction_id: b.loyalty_transaction_id ?? "",

      Comission: b.Comission ?? 0,
      Redemption: b.Redemption ?? 0,
      Redeemed_points: b.Redeemed_points ?? 0,

      Loyalty_transaction_type: b.Loyalty_transaction_type ?? "",
      Other_party_business_type: b.Other_party_business_type ?? "",
      Relationship_type: b.Relationship_type ?? "",
      Loyalty_transaction_id_1: b.Loyalty_transaction_id_1 ?? "",
      Loyalty_transaction_status_1: b.Loyalty_transaction_status_1 ?? "",
      Loyalty_transaction_id_2: b.Loyalty_transaction_id_2 ?? "",
      Loyalty_transaction_status_2: b.Loyalty_transaction_status_2 ?? "",
      Enuiry_id_1: b.Enuiry_id_1 ?? "",
      Enquiy_id_1_status: b.Enquiy_id_1_status ?? "",
      Other_enquiriy_ids: b.Other_enquiriy_ids ?? "",
      Other_enquiry_id_status: b.Other_enquiry_id_status ?? "",

      Offer_id: b.Offer_id ?? "",
      Offer_Name: b.Offer_Name ?? "",
      Offer_discount_type: b.Offer_discount_type ?? "",
      Offer_discount: b.Offer_discount ?? 0,

      total: b.total ?? 0,
      total_payable: b.total_payable ?? 0,
      trial_price: b.trial_price ?? 0,
      address_id: b.address_id ?? null,
      order_type: b.order_type ?? "",
      make_a_gift: b.make_a_gift ?? 0,
      add_alteration: b.add_alteration ?? 0,
      slot_id: b.slot_id ?? null,
      appointment_id: b.appointment_id ?? null,
      amount_due: b.amount_due ?? 0,
      refund: b.refund ?? 0,
      stage: b.stage ?? "",
      status_progress: b.status_progress ?? "",
      delivery_text: b.delivery_text ?? "",
      gift_product_id: b.gift_product_id ?? null,
      gift_variant_id: b.gift_variant_id ?? null,

      payment_method:
        b.payment_method === "other"
          ? b.payment_method_name || null
          : b.payment_method || null,
      txn_id: b.txn_id ?? null,

      delivery_date: b.delivery_date ?? null,
      delivery_time: b.delivery_time ?? null,

      latitude: b.latitude ?? null,
      longitude: b.longitude ?? null,

      order_note: b.order_note ?? "",
    };

    if (b.payment_method === "other" && !b.payment_method_name) {
      return res.json({
        error: true,
        message: "Please enter payment method name",
        data: [],
      });
    }

    const cart = await get_cart_total(user_id, false, "0", "");
    if (!cart || !cart.overall_amount) {
      return res.json({
        error: true,
        message: "Your Cart is empty.",
        data: [],
      });
    }
    const final_total = Number(cart.overall_amount || 0);
    place_order_data.final_total = final_total;

    const result = await _new_place_order(place_order_data, seller_id);

    if (result && result.order_id) {
      const trans_data = {
        transaction_type: "transaction",
        user_id,
        order_id: result.order_id,
        type: String(place_order_data.payment_method || "").toLowerCase(),
        txn_id: place_order_data.txn_id || null,
        amount: final_total,
        status: "",
        message: "",
        order_item_id: null,
      };
      await add_transaction(trans_data);

      if (place_order_data.appointment_id) {
        await pool.query(
          "UPDATE soc_booking_user SET order_id = ? WHERE id = ?",
          [result.order_id, place_order_data.appointment_id]
        );
      }

      return res.json({
        error: false,
        message: "Order Delivered Successfully.",
        data: result,
      });
    } else {
      return res.json({
        error: true,
        message: result?.message || "Failed to place order",
        data: result || {},
      });
    }
  } catch (err) {
    console.error("newPlaceOrder error:", err);
    return res.json({ error: true, message: err.message, data: [] });
  }
}

function parseMaybeCSV(val) {
  if (Array.isArray(val))
    return val.map((v) => (typeof v === "string" ? v.trim() : String(v)));
  if (typeof val === "string") {
    if (!val.trim()) return [];
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (val == null) return [];
  return [String(val)];
}

async function verifyToken(req) {
  return true;
}

async function _new_place_order(data, seller_id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let total_payable = Number(data.total_payable || 0);
    let Wallet_used = false;

    if (
      String(data.is_wallet_used) === "1" &&
      Number(data.wallet_balance_used) <= Number(data.final_total)
    ) {
      const walletRes = await update_wallet_balance(
        conn,
        "debit",
        data.user_id,
        Number(data.wallet_balance_used),
        "Used against Order Placement"
      );
      if (walletRes.error) {
        await conn.rollback();
        return walletRes;
      }
      total_payable -= Number(data.wallet_balance_used);
      Wallet_used = true;
    } else {
      if (
        String(data.is_wallet_used) === "1" &&
        Number(data.wallet_balance_used) > Number(data.final_total)
      ) {
        await conn.rollback();
        return {
          error: true,
          message: "Wallet Balance should not exceed the total amount",
        };
      }
    }

    let status = data.active_status ?? "received";
    if (
      data.wallet_balance_used &&
      Number(data.wallet_balance_used) === Number(data.final_total)
    ) {
      status = "received";
    }

    let addressStr = "";
    if (data.address_id) {
      const addressRows = await conn.query(
        "SELECT * FROM addresses WHERE id = ?",
        [data.address_id]
      );
      const a = addressRows?.[0]?.[0];
      if (a) {
        const parts = [];
        if (a.address && a.address !== "NULL") parts.push(a.address);
        if (a.landmark && a.landmark !== "NULL") parts.push(a.landmark);
        if (a.area && a.area !== "NULL") parts.push(a.area);
        if (a.city && a.city !== "NULL") parts.push(a.city);
        if (a.state && a.state !== "NULL") parts.push(a.state);
        if (a.country && a.country !== "NULL") parts.push(a.country);
        if (a.pincode && a.pincode !== "NULL") parts.push(a.pincode);
        addressStr = parts.join(", ");
      }
    }

    const order_data = {
      user_id: data.user_id,
      mobile: data.mobile || "",
      total: Number(data.total || 0),
      total_payable: total_payable,
      delivery_charge: Number(data.delivery_charge || 0),
      is_delivery_charge_returnable: Number(
        data.is_delivery_charge_returnable || 0
      ),
      wallet_balance: Wallet_used ? Number(data.wallet_balance_used || 0) : 0,
      final_total: Number(data.final_total || 0),
      amount_due: Number(data.amount_due || 0),
      refund: Number(data.refund || 0),
      trial_price: Number(data.trial_price || 0),
      discount: Number(data.discount || 0),
      payment_method: data.payment_method || "",
      promo_code: data.promo_code || "",
      email: data.email || " ",
      is_pos_order: Number(data.is_pos_order || 0),
      new_order_type: data.new_order_type || "",
      new_payment_type: data.new_payment_type || "",
      new_shipping_type: data.new_shipping_type || "",
      new_payment_status: data.new_payment_status || "",
      new_shipping_status: data.new_shipping_status || "",
      new_discount: Number(data.new_discount || 0),
      new_shipping_price: Number(data.new_shipping_price || 0),
      new_total_price: Number(data.new_total_price || 0),
      payment_ref_id: data.payment_ref_id || "",
      payment_ref_picture: data.payment_ref_picture || "",
      shopping_details_1: data.shopping_details_1 || "",
      shopping_details_2: data.shopping_details_2 || "",
      shopping_details_3: data.shopping_details_3 || "",
      shopping_details_4: data.shopping_details_4 || "",
      rider_name: data.rider_name || "",
      rider_user_id: Number(data.rider_user_id || 0),
      employee_name: data.employee_name || "",
      employee_user_id: Number(data.employee_user_id || 0),
      loyalty_given: Number(data.loyalty_given || 0),
      loyalty_amount: Number(data.loyalty_amount || 0),
      p_status: data.p_status || "",
      loyalty_transaction_id: data.loyalty_transaction_id || "",
      Redeemed_points: Number(data.Redeemed_points || 0),
      Redemption: Number(data.Redemption || 0),
      Offer_id: data.Offer_id || "",
      Offer_Name: data.Offer_Name || "",
      Offer_discount_type: data.Offer_discount_type || "",
      Offer_discount: Number(data.Offer_discount || 0),
      Enuiry_id_1: data.Enuiry_id_1 || "",
      Enquiy_id_1_status: data.Enquiy_id_1_status || "",
      Other_enquiriy_ids: data.Other_enquiriy_ids || "",
      Other_enquiry_id_status: data.Other_enquiry_id_status || "",
      Loyalty_transaction_type: data.Loyalty_transaction_type || "",
      Loyalty_transaction_id_1: data.Loyalty_transaction_id_1 || "",
      Loyalty_transaction_id_2: data.Loyalty_transaction_id_2 || "",
      Loyalty_transaction_status_1: data.Loyalty_transaction_status_1 || "",
      Loyalty_transaction_status_2: data.Loyalty_transaction_status_2 || "",
      Comission: Number(data.Comission || 0),
      slot_id: data.slot_id || null,
      appointment_id: data.appointment_id || null,
      order_type: data.order_type || "",
      make_a_gift: Number(data.make_a_gift || 0),
      add_alteration: Number(data.add_alteration || 0),
      status: status,
      promo_discount: Number(data.promo_discount || 0),
      seller_id: seller_id ?? 0,
      stage: data.stage || "",
      status_progress: data.status_progress || "",
      delivery_text: data.delivery_text || "",
      gift_product_id: data.gift_product_id || null,
      gift_variant_id: data.gift_variant_id || null,
      address_id: data.address_id || null,
      address: addressStr,
      delivery_date: data.delivery_date ? new Date(data.delivery_date) : null,
      delivery_time: data.delivery_time || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      notes: data.order_note || "",
      created_at: new Date(),
    };

    const [orderResult] = await conn.query("INSERT INTO orders SET ?", [
      order_data,
    ]);
    const last_order_id = orderResult.insertId;
    if (!last_order_id) {
      await conn.rollback();
      const bal = await fetch_details("users", { id: data.user_id }, "balance");
      return {
        error: true,
        message: "Product(s) Not Found!",
        order_id: last_order_id,
        balance: bal,
      };
    }

    let product_variant = [];
    if (
      Array.isArray(data.product_variant_id) &&
      data.product_variant_id.length > 0
    ) {
      const placeholders = data.product_variant_id.map(() => "?").join(",");
      const [pvRows] = await conn.query(
        `
        SELECT pv.*,
               tax.percentage AS tax_percentage,
               tax.title      AS tax_name,
               p.seller_id    AS seller_id,
               p.name         AS product_name,
               p.type         AS product_type,
               p.is_prices_inclusive_tax,
               p.is_attachment_required,
               p.download_link
        FROM product_variants pv
        LEFT JOIN products p    ON pv.product_id = p.id
        LEFT JOIN categories c  ON p.category_id = c.id
        LEFT JOIN taxes tax     ON tax.id = p.tax
        WHERE pv.id IN (${placeholders})
        `,
        data.product_variant_id
      );
      product_variant = pvRows || [];
    }

    const quantities = parseMaybeCSV(data.quantity);
    for (let i = 0; i < product_variant.length; i++) {
      product_variant[i].qty = Number(quantities[i] || 0);
    }

    const parcels = {};
    for (const p of product_variant) {
      const prctg = Number(p.tax_percentage || 0);
      let price_tax_amount = 0;
      let special_price_tax_amount = 0;

      if (
        (p.is_prices_inclusive_tax === 0 ||
          p.is_prices_inclusive_tax === null) &&
        prctg > 0
      ) {
        price_tax_amount = Number(p.price) * (prctg / 100);
        special_price_tax_amount = Number(p.special_price || 0) * (prctg / 100);
      }

      let unitPrice =
        Number(p.special_price || 0) > 0
          ? Number(p.special_price) + special_price_tax_amount
          : Number(p.price) + price_tax_amount;

      const lineTotal = unitPrice * Number(p.qty || 0);
      const sid = p.seller_id || 0;

      if (!parcels[sid])
        parcels[sid] = { variant_id: "", total: 0, delivery_charge: 0 };
      parcels[sid].variant_id += (p.id ? p.id : "") + ",";
      parcels[sid].total += lineTotal;
    }

    const modes = parseMaybeCSV(data.modes);
    const locations = parseMaybeCSV(data.locations);
    const sub_locations = parseMaybeCSV(data.sub_locations);
    const location_status = parseMaybeCSV(data.location_status);
    const trial_prices = parseMaybeCSV(data.trial_prices);

    for (let i = 0; i < product_variant.length; i++) {
      const p = product_variant[i];
      const sidRow = await conn.query(
        "SELECT seller_id FROM orders WHERE id = ?",
        [last_order_id]
      );
      const sellerf = sidRow?.[0]?.[0]?.seller_id || 0;

      const prctg = Number(p.tax_percentage || 0);
      let unitPrice =
        Number(p.special_price || 0) > 0
          ? Number(p.special_price)
          : Number(p.price);
      let tax_amount = 0;
      if (
        (p.is_prices_inclusive_tax === 0 ||
          p.is_prices_inclusive_tax === null) &&
        prctg > 0
      ) {
        tax_amount = unitPrice * (prctg / 100);
        unitPrice += tax_amount;
      } else {
        tax_amount = 0;
      }

      const sub_total = unitPrice * Number(quantities[i] || 0);

      const row = {
        user_id: data.user_id,
        order_id: last_order_id,
        seller_id: sellerf,
        product_name: p.product_name,
        variant_name: p.variant_name,
        product_variant_id: p.id,
        quantity: Number(quantities[i] || 0),
        price: unitPrice,
        mode: modes[i] ?? "",
        location_id: locations[i] ?? "",
        sub_location_id: sub_locations[i] ?? "",
        location_status: location_status[i] ?? "",
        trial_price: Number(trial_prices[i] || 0),
        tax_percent: prctg,
        tax_amount: tax_amount,
        sub_total: sub_total,
        status: JSON.stringify([
          [status, new Date().toLocaleString("en-GB", { hour12: true })],
        ]),
        active_status: status,
        otp: 0,
      };

      const [oiRes] = await conn.query("INSERT INTO order_items SET ?", [row]);
      const order_item_id = oiRes.insertId;

      if (p.download_link) {
        const hash_link = `${p.download_link}?${order_item_id}`;
        await conn.query("UPDATE order_items SET hash_link = ? WHERE id = ?", [
          hash_link,
          order_item_id,
        ]);
      }
    }

    const promo_code_discount = Number(data.promo_discount || 0);
    const delivery_charge = Number(data.delivery_charge || 0);
    let parcel_sub_total = 0;
    for (const sid of Object.keys(parcels))
      parcel_sub_total += parcels[sid].total;

    const is_delivery_boy_otp_setting_on = true;
    for (const sid of Object.keys(parcels)) {
      const parcel = parcels[sid];
      const discount_percentage = parcel_sub_total
        ? (parcel.total * 100) / parcel_sub_total
        : 0;
      const seller_promocode_discount =
        (promo_code_discount * discount_percentage) / 100;
      const seller_delivery_charge =
        (delivery_charge * discount_percentage) / 100;
      const otp = Math.floor(100000 + Math.random() * 900000);

      const variantIds = (parcel.variant_id || "").split(",").filter(Boolean);
      let order_item_ids = "";
      for (const vid of variantIds) {
        const [idRows] = await conn.query(
          "SELECT id FROM order_items WHERE seller_id = ? AND product_variant_id = ? AND order_id = ?",
          [sid, vid, last_order_id]
        );
        if (idRows?.[0]?.id) order_item_ids += idRows[0].id + ",";
      }

      const order_item_id_list = order_item_ids.split(",").filter(Boolean);
      for (const id of order_item_id_list) {
        await conn.query("UPDATE order_items SET otp = ? WHERE id = ?", [
          is_delivery_boy_otp_setting_on ? otp : 0,
          id,
        ]);
      }

      const parcel_total =
        Math.round(
          (parcel.total +
            Number(seller_delivery_charge) -
            Number(seller_promocode_discount)) *
            100
        ) / 100;

      const order_parcels = {
        seller_id: sid,
        product_variant_ids: (parcel.variant_id || "").replace(/,$/, ""),
        order_id: last_order_id,
        order_item_ids: (order_item_ids || "").replace(/,$/, ""),
        delivery_charge: Math.round(Number(seller_delivery_charge) * 100) / 100,
        promo_code: data.promo_code || "",
        promo_discount: Number(data.promo_discount || 0),
        sub_total: parcel.total,
        total: parcel_total,
        otp: is_delivery_boy_otp_setting_on ? otp : 0,
      };
      await conn.query("INSERT INTO order_charges SET ?", [order_parcels]);
    }

    if (
      Array.isArray(data.product_variant_id) &&
      data.product_variant_id.length
    ) {
      const qtns = parseMaybeCSV(data.quantity);
      await update_stock(conn, data.product_variant_id, qtns);
    }

    const user_balance = await fetch_details(
      "users",
      { id: data.user_id },
      "balance"
    );
    await conn.commit();

    return {
      error: false,
      message: "Order Placed Successfully",
      order_id: last_order_id,
      order_item_data: [],
      balance: user_balance,
    };
  } catch (e) {
    await conn.rollback();
    console.error("new_place_order failed:", e);
    return { error: true, message: e.message };
  } finally {
    conn.release();
  }
}

async function fetch_details(table, where = null, fields = "*") {
  const clauses = [];
  const vals = [];
  if (where && typeof where === "object") {
    for (const k of Object.keys(where)) {
      clauses.push(`${k} = ?`);
      vals.push(where[k]);
    }
  }
  const sql = `SELECT ${fields} FROM ${table} ${
    clauses.length ? "WHERE " + clauses.join(" AND ") : ""
  }`;
  const [rows] = await pool.query(sql, vals);
  return rows;
}

async function update_wallet_balance(
  conn,
  operation,
  user_id,
  amount,
  message = "Balance Debited",
  order_item_id = "",
  is_refund = 0,
  transaction_type = "wallet",
  status = ""
) {
  const [balRows] = await conn.query("SELECT balance FROM users WHERE id = ?", [
    user_id,
  ]);
  if (!balRows?.length) {
    return { error: true, message: "User does not exist", data: [] };
  }
  const balance = Number(balRows[0].balance || 0);

  if (operation === "debit" && amount > balance) {
    return {
      error: true,
      message: "Debited amount can't exceeds the user balance !",
      data: [],
    };
  }
  if (amount === 0) {
    return { error: true, message: "Amount can't be Zero !", data: [] };
  }

  let newBalance = balance;
  if (operation === "debit") {
    newBalance = balance - amount;
    message = message || "Balance Debited";
  } else if (operation === "credit") {
    newBalance = balance + amount;
    message = message || "Balance Credited";
  } else {
    newBalance = balance + amount;
    message = message || "Balance refuned";
  }

  await conn.query("UPDATE users SET balance = ? WHERE id = ?", [
    newBalance,
    user_id,
  ]);

  const tx = {
    transaction_type,
    user_id,
    type: operation === "refund" ? "refund" : operation,
    amount,
    message,
    order_item_id: order_item_id || null,
    is_refund,
    status: status || "success",
  };
  await conn.query("INSERT INTO transactions SET ?", [tx]);

  return { error: false, message: "Balance Update Successfully", data: [] };
}

async function get_cart_total(
  user_id,
  product_variant_id = false,
  is_saved_for_later = "0",
  address_id = ""
) {
  const params = [user_id];
  let wherePV = "";
  if (product_variant_id) {
    wherePV = "AND c.product_variant_id = ? AND c.qty != 0";
    params.push(product_variant_id);
  } else {
    wherePV = "AND c.qty >= 0";
  }

  const [rows] = await pool.query(
    `
    SELECT
      c.id AS cart_id, c.qty, c.is_saved_for_later,
      pv.id, pv.price, pv.special_price,
      p.id AS product_id, p.is_prices_inclusive_tax, p.seller_id,
      tax.percentage AS tax_percentage, tax.title AS tax_title
    FROM cart c
    JOIN product_variants pv ON pv.id = c.product_variant_id
    JOIN products p          ON p.id  = pv.product_id
    JOIN seller_data sd      ON sd.user_id = p.seller_id
    LEFT JOIN taxes tax      ON tax.id = p.tax
    WHERE c.user_id = ? ${wherePV}
      AND p.status = 1 AND pv.status = 1 AND sd.status = 1
      AND c.is_saved_for_later = ${is_saved_for_later === "0" ? 0 : 1}
    ORDER BY c.id DESC
    `,
    params
  );

  if (!rows.length) return null;

  let total = 0;
  let amountTax = 0;
  const quantities = [];
  const percentages = [];

  for (const r of rows) {
    const prctg = Number(r.tax_percentage || 0);
    let price_tax_amount = 0;
    let special_price_tax_amount = 0;

    if (
      (r.is_prices_inclusive_tax === 0 || r.is_prices_inclusive_tax == null) &&
      prctg > 0
    ) {
      price_tax_amount = Number(r.price) * (prctg / 100);
      special_price_tax_amount = Number(r.special_price || 0) * (prctg / 100);
    }

    const unit =
      Number(r.special_price || 0) > 0
        ? Number(r.special_price) + special_price_tax_amount
        : Number(r.price) + price_tax_amount;

    const lineTotal = unit * Number(r.qty || 0);
    total += lineTotal;

    let tax_amount_line = 0;
    const price =
      Number(r.special_price || 0) > 0
        ? Number(r.special_price)
        : Number(r.price);

    if (r.is_prices_inclusive_tax === 1 && prctg > 0) {
      tax_amount_line = price - price * (100 / (100 + prctg));
    } else if (prctg > 0) {
      tax_amount_line = price * (prctg / 100);
    }
    amountTax += tax_amount_line * Number(r.qty || 0);

    quantities.push(Number(r.qty || 0));
    percentages.push(prctg);
  }

  const delivery_charge = 0;
  const overall_amt = total + delivery_charge;

  return {
    total_items: rows.reduce((acc, r) => acc + Number(r.qty || 0), 0),
    cart_count: rows.length,
    sub_total: String(total),
    quantity: String(quantities.reduce((a, b) => a + b, 0)),
    tax_percentage: String(percentages.reduce((a, b) => a + b, 0)),
    tax_amount: String(amountTax),
    delivery_charge,
    overall_amount: String(overall_amt),
    amount_inclusive_tax: String(overall_amt + amountTax),
    is_attachment_required: 0,
    download_allowed: [],
  };
}

async function update_stock(conn, variantIds, qtns) {
  if (!Array.isArray(variantIds)) return;
  for (let i = 0; i < variantIds.length; i++) {
    const vid = variantIds[i];
    const qty = Number(qtns[i] || 0);
    await conn.query(
      "UPDATE product_variants SET stock = GREATEST(stock - ?, 0) WHERE id = ?",
      [qty, vid]
    );
  }
}

async function add_transaction(data) {
  const tx = {
    transaction_type: data.transaction_type || "transaction",
    user_id: data.user_id,
    order_id: data.order_id,
    order_item_id: data.order_item_id || null,
    type: String(data.type || "").toLowerCase(),
    txn_id: data.txn_id || null,
    amount: Number(data.amount || 0),
    status: data.status || "",
    message: data.message || "",
  };
  await pool.query("INSERT INTO transactions SET ?", [tx]);
}

module.exports = {
  newPlaceOrder,
};
