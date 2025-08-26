const pool = require("../config/db");

async function bookTour(req, res) {
  try {
    const {
      child_id,
      user_id,
      booking_date,
      booking_id,
      user_name,
      booking_type,
      society_id,
      phone,
      pickup_location,
      delivery_location,
      stylist_id,
      stylist_name,
      rider_id,
      rider_name,
      vehicle_id,
      vehicle_name,
      order_id,
      order_status,
      appointment_status,
      society_name,
      store_id,
      store_name,
      product_ids,
      variant_ids,
      store_ids,
      seller_id,
      nowlater,
      final_time,
      extra_notes,
      video_id,
      concierge = 0,
      concierge_type,
      price_point_1,
      price_point_2,
      categories,
      colors,
      concierge_description,
      concierge_outlets,
      concierge_malls,
      price_list,
      body_types,
      concierge_texture,
      concierge_fabric,
      concierge_trends,
      concierge_occasion,
      prompt_chat,
      video_json,
      new_categories,
    } = req.body;

    if (
      !child_id ||
      !user_id ||
      !booking_date ||
      !booking_id ||
      !user_name ||
      !booking_type ||
      !society_id
    ) {
      return res.json({ error: true, message: "Missing required fields" });
    }

    const [userRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE id = ?",
      [user_id]
    );
    if (userRows[0].count === 0) {
      return res.json({ error: true, message: "User id Not Found" });
    }

    const [slotRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM soc_bookings_details WHERE id = ?",
      [child_id]
    );
    if (slotRows[0].count === 0) {
      return res.json({ error: true, message: "Slots id Not Found" });
    }

    const [bookingRows] = await pool.query(
      "SELECT COUNT(*) AS count FROM soc_bookings WHERE id = ?",
      [booking_id]
    );
    if (bookingRows[0].count === 0) {
      return res.json({ error: true, message: "Booking id Not Found" });
    }

    await pool.query(
      "UPDATE soc_bookings_details SET user_booking_date = ?, status = ? WHERE id = ?",
      [new Date().toISOString().slice(0, 10), "available", child_id]
    );

    const bookingUserData = {
      booking_id,
      child_id,
      user_id,
      user_name,
      booking_type,
      pickup_location,
      delivery_location,
      phone,
      booking_date,
      stylist_id,
      stylist_name,
      rider_id,
      rider_name,
      vehicle_id,
      vehicle_name,
      order_id,
      order_status,
      appointment_status,
      society_id,
      society_name,
      store_Id: store_id,
      store_name,
      product_ids,
      variant_ids,
      store_ids,
      seller_id,
      final_time,
      nowlater,
      extra_notes,
      video_id,
      concierge,
      concierge_type,
      price_point_1,
      price_point_2,
      categories,
      colors,
      concierge_description,
      concierge_outlets,
      concierge_malls,
      price_list,
      body_types,
      concierge_texture,
      concierge_fabric,
      concierge_trends,
      concierge_occasion,
      prompt_chat,
      video_json,
      new_categories,
      created_at: new Date(),
    };

    const [insertResult] = await pool.query(
      "INSERT INTO soc_booking_user SET ?",
      [bookingUserData]
    );

    if (insertResult.affectedRows > 0) {
      return res.json({
        error: false,
        message: "Booking created successfully",
      });
    } else {
      return res.json({ error: true, message: "Failed to create booking" });
    }
  } catch (err) {
    console.error("Error in bookTour:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function updateTour(req, res) {
  try {
    const {
      child_id,
      soc_id,
      user_id,
      booking_date,
      booking_id,
      user_name,
      booking_type,
      pickup_location,
      delivery_location,
      phone,
      stylist_id,
      stylist_name,
      rider_id,
      rider_name,
      vehicle_id,
      vehicle_name,
      order_id,
      order_status,
      appointment_status,
      society_id,
      society_name,
      store_Id,
      store_id,
      store_name,
      product_ids,
      store_ids,
      seller_id,
      final_time,
      nowlater,
    } = req.body;

    if (
      !child_id ||
      !user_id ||
      !booking_date ||
      !booking_id ||
      !user_name ||
      !booking_type ||
      !society_id
    ) {
      return res.json({ error: true, message: "Missing required fields" });
    }

    const userBookingDate = new Date();
    const [slotUpdate] = await pool.query(
      "UPDATE soc_bookings_details SET user_booking_date = ?, status = ? WHERE id = ?",
      [userBookingDate, "booked", child_id]
    );

    if (slotUpdate.affectedRows === 0) {
      return res.json({ error: true, message: "failed" });
    }

    const payload = {
      booking_id,
      child_id,
      user_id,
      user_name,
      booking_type,
      pickup_location,
      delivery_location,
      phone,
      booking_date,
      society_id,
      society_name,
      store_Id: store_Id ?? store_id ?? null,
      store_name,
      product_ids,
      store_ids,
      seller_id,
      final_time,
      nowlater,
      stylist_id,
      stylist_name,
      rider_id,
      rider_name,
      vehicle_id,
      vehicle_name,
      order_id,
      order_status,
      appointment_status,
    };

    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    const setSql = keys.map((k) => `\`${k}\` = ?`).join(", ");
    const values = keys.map((k) => payload[k]);

    const [bookingUpdate] = await pool.query(
      `UPDATE soc_booking_user SET ${setSql} WHERE booking_id = ? AND user_id = ? AND child_id = ?`,
      [...values, booking_id, user_id, child_id]
    );

    return res.json({
      error: false,
      message: "update",
    });
  } catch (err) {
    console.error("Error in updateTour:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function listOutletSlots(req, res) {
  try {
    const bookingdate = req.query.bookingdate;
    const society_id =
      req.query.society_id ??
      req.query.socity_id ??
      req.query.outlet_id ??
      req.query.soc_id;

    if (!bookingdate || !society_id) {
      return res.json({
        error: true,
        message: "bookingdate and society_id are required",
      });
    }

    const [bookings] = await pool.query(
      `SELECT id, booking_date, soc_id
       FROM soc_bookings
       WHERE booking_date = ? AND soc_id = ?
       ORDER BY id DESC`,
      [bookingdate, society_id]
    );

    if (!bookings.length) {
      return res.json({ rows: [] });
    }

    const bookingIds = bookings.map((b) => b.id);
    const outletId = String(society_id);

    const [sellerRows] = await pool.query(
      `SELECT * FROM seller_data WHERE user_id = ?`,
      [outletId]
    );

    const outlet_name = sellerRows;

    const [detailRows] = await pool.query(
      `SELECT * FROM soc_bookings_details
       WHERE soc_id = ? AND booking_id IN (${bookingIds
         .map(() => "?")
         .join(",")})`,
      [outletId, ...bookingIds]
    );

    const detailsByBookingId = detailRows.reduce((acc, d) => {
      const key = d.booking_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    }, {});

    const rows = bookings.map((row) => ({
      booking_date: row.booking_date,
      id: row.id,
      outlet_id: row.soc_id,
      outlet_name,
      booking_details: detailsByBookingId[row.id] ?? [],
    }));

    return res.json({ rows });
  } catch (err) {
    console.error("Error in listOutletSlots:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function socUserBookings(req, res) {
  try {
    const user_id = req.query.user_id ?? req.params.user_id;
    if (!user_id) {
      return res.json({ error: true, message: "not found" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        b.booking_date               AS booking_date,
        b.id                         AS booking_id,
        d.id                         AS childid,
        DATE_FORMAT(d.start_time, '%h:%i %p') AS start_time,
        d.status                     AS detail_status,
        d.user_booking_date          AS user_booking_date,

        u.id                         AS u_id,
        u.booking_id                 AS u_booking_id,
        u.child_id                   AS u_child_id,
        u.user_id                    AS u_user_id,
        u.user_name                  AS u_user_name,
        u.booking_type               AS u_booking_type,
        u.pickup_location            AS u_pickup_location,
        u.delivery_location          AS u_delivery_location,
        u.phone                      AS u_phone,
        u.booking_date               AS u_booking_date,
        u.stylist_id                 AS u_stylist_id,
        u.stylist_name               AS u_stylist_name,
        u.rider_id                   AS u_rider_id,
        u.rider_name                 AS u_rider_name,
        u.vehicle_id                 AS u_vehicle_id,
        u.vehicle_name               AS u_vehicle_name,
        u.order_id                   AS u_order_id,
        u.order_status               AS u_order_status,
        u.appointment_status         AS u_appointment_status,
        u.stage                      AS u_stage,
        u.created_at                 AS u_created_at,
        u.updated_at                 AS u_updated_at,
        u.society_id                 AS u_society_id,
        u.society_name               AS u_society_name,
        u.store_Id                   AS u_store_Id,
        u.store_name                 AS u_store_name,
        u.product_ids                AS u_product_ids,
        u.variant_ids                AS u_variant_ids,
        u.store_ids                  AS u_store_ids,
        u.seller_id                  AS u_seller_id,
        u.final_time                 AS u_final_time,
        u.nowlater                   AS u_nowlater,
        u.extra_notes                AS u_extra_notes,
        u.video_id                   AS u_video_id,
        u.concierge                  AS u_concierge,
        u.concierge_type             AS u_concierge_type,
        u.price_point_1              AS u_price_point_1,
        u.price_point_2              AS u_price_point_2,
        u.categories                 AS u_categories,
        u.colors                     AS u_colors,
        u.concierge_description      AS u_concierge_description,
        u.concierge_outlets          AS u_concierge_outlets,
        u.concierge_malls            AS u_concierge_malls,
        u.price_list                 AS u_price_list,
        u.body_types                 AS u_body_types,
        u.concierge_texture          AS u_concierge_texture,
        u.concierge_fabric           AS u_concierge_fabric,
        u.concierge_trends           AS u_concierge_trends,
        u.concierge_occasion         AS u_concierge_occasion,
        u.prompt_chat                AS u_prompt_chat,
        u.outlet_total               AS u_outlet_total,
        u.discount                   AS u_discount,
        u.club_points                AS u_club_points,
        u.final_payable              AS u_final_payable,
        u.amount_due                 AS u_amount_due,
        u.payment_status             AS u_payment_status,
        u.qr_image                   AS u_qr_image,
        u.receipt                    AS u_receipt,
        u.product_names              AS u_product_names,
        u.product_prices             AS u_product_prices,
        u.product_discounts          AS u_product_discounts,
        u.product_tax_percents       AS u_product_tax_percents,
        u.product_tax_values         AS u_product_tax_values,
        u.product_price_excl_tax     AS u_product_price_excl_tax,
        u.product_images             AS u_product_images,
        u.product_barcodes           AS u_product_barcodes,
        u.invoice_pdf                AS u_invoice_pdf,
        u.customer_address           AS u_customer_address,
        u.consumer_confirm           AS u_consumer_confirm,
        u.video_json                 AS u_video_json,
        u.new_categories             AS u_new_categories
      FROM soc_bookings b
      JOIN soc_bookings_details d ON d.booking_id = b.id
      JOIN soc_booking_user u     ON d.id = u.child_id
      WHERE u.user_id = ?
      `,
      [user_id]
    );

    if (!rows.length) {
      return res.json({
        error: false,
        message: "update",
        data: { rows: [] },
      });
    }

    const mapped = rows.map((r) => ({
      booking_date: r.booking_date,
      id: r.booking_id,
      childid: r.childid,
      start_time: r.start_time,
      status: r.detail_status,
      user_booking_date: r.user_booking_date,
      details: {
        id: r.booking_id,
        booking_id: r.u_booking_id,
        child_id: r.u_child_id,
        user_id: r.u_user_id,
        user_name: r.u_user_name,
        booking_type: r.u_booking_type,
        pickup_location: r.u_pickup_location,
        delivery_location: r.u_delivery_location,
        phone: r.u_phone,
        booking_date: r.u_booking_date,
        stylist_id: r.u_stylist_id,
        stylist_name: r.u_stylist_name,
        rider_id: r.u_rider_id,
        rider_name: r.u_rider_name,
        vehicle_id: r.u_vehicle_id,
        vehicle_name: r.u_vehicle_name,
        order_id: r.u_order_id,
        order_status: r.u_order_status,
        appointment_status: r.u_appointment_status,
        stage: r.u_stage,
        created_at: r.u_created_at,
        updated_at: r.u_updated_at,
        society_id: r.u_society_id,
        society_name: r.u_society_name,
        store_Id: r.u_store_Id,
        store_name: r.u_store_name,
        product_ids: r.u_product_ids,
        variant_ids: r.u_variant_ids,
        store_ids: r.u_store_ids,
        seller_id: r.u_seller_id,
        final_time: r.u_final_time,
        nowlater: r.u_nowlater,
        extra_notes: r.u_extra_notes,
        video_id: r.u_video_id,
        concierge: r.u_concierge,
        concierge_type: r.u_concierge_type,
        price_point_1: r.u_price_point_1,
        price_point_2: r.u_price_point_2,
        categories: r.u_categories,
        colors: r.u_colors,
        concierge_description: r.u_concierge_description,
        concierge_outlets: r.u_concierge_outlets,
        concierge_malls: r.u_concierge_malls,
        price_list: r.u_price_list,
        body_types: r.u_body_types,
        concierge_texture: r.u_concierge_texture,
        concierge_fabric: r.u_concierge_fabric,
        concierge_trends: r.u_concierge_trends,
        concierge_occasion: r.u_concierge_occasion,
        prompt_chat: r.u_prompt_chat,
        outlet_total: r.u_outlet_total,
        discount: r.u_discount,
        club_points: r.u_club_points,
        final_payable: r.u_final_payable,
        amount_due: r.u_amount_due,
        payment_status: r.u_payment_status,
        qr_image: r.u_qr_image,
        receipt: r.u_receipt,
        product_names: r.u_product_names,
        product_prices: r.u_product_prices,
        product_discounts: r.u_product_discounts,
        product_tax_percents: r.u_product_tax_percents,
        product_tax_values: r.u_product_tax_values,
        product_price_excl_tax: r.u_product_price_excl_tax,
        product_images: r.u_product_images,
        product_barcodes: r.u_product_barcodes,
        invoice_pdf: r.u_invoice_pdf,
        customer_address: r.u_customer_address,
        consumer_confirm: r.u_consumer_confirm,
        video_json: r.u_video_json,
        new_categories: r.u_new_categories,
      },
    }));

    return res.json({
      error: false,
      message: "update",
      data: { rows: mapped },
    });
  } catch (err) {
    console.error("Error in socUserBookings:", err);
    return res.json({ error: true, message: err.message });
  }
}

function mapRow(r, includeExtended = false) {
  const base = {
    booking_date: r.booking_date,
    id: r.booking_id,
    childid: r.childid,
    start_time: r.start_time,
    status: r.detail_status,
    user_booking_date: r.user_booking_date,
    details: {
      id: r.booking_id,
      booking_id: r.u_booking_id,
      child_id: r.u_child_id,
      user_id: r.u_user_id,
      user_name: r.u_user_name,
      booking_type: r.u_booking_type,
      pickup_location: r.u_pickup_location,
      delivery_location: r.u_delivery_location,
      phone: r.u_phone,
      booking_date: r.u_booking_date,
      stylist_id: r.u_stylist_id,
      stylist_name: r.u_stylist_name,
      rider_id: r.u_rider_id,
      rider_name: r.u_rider_name,
      vehicle_id: r.u_vehicle_id,
      vehicle_name: r.u_vehicle_name,
      order_id: r.u_order_id,
      order_status: r.u_order_status,
      appointment_status: r.u_appointment_status,
      created_at: r.u_created_at,
      updated_at: r.u_updated_at,
      society_id: r.u_society_id,
      society_name: r.u_society_name,
      store_Id: r.u_store_Id,
      store_name: r.u_store_name,
      product_ids: r.u_product_ids,
      variant_ids: r.u_variant_ids,
      store_ids: r.u_store_ids,
      seller_id: r.u_seller_id,
      final_time: r.u_final_time,
      nowlater: r.u_nowlater,
      extra_notes: r.u_extra_notes,
      video_id: r.u_video_id,
    },
  };

  if (includeExtended) {
    Object.assign(base.details, {
      concierge: r.u_concierge,
      concierge_type: r.u_concierge_type,
      price_point_1: r.u_price_point_1,
      price_point_2: r.u_price_point_2,
      categories: r.u_categories,
      colors: r.u_colors,
      concierge_description: r.u_concierge_description,
      concierge_outlets: r.u_concierge_outlets,
      concierge_malls: r.u_concierge_malls,
      price_list: r.u_price_list,
      body_types: r.u_body_types,
      concierge_texture: r.u_concierge_texture,
      concierge_fabric: r.u_concierge_fabric,
      concierge_trends: r.u_concierge_trends,
      concierge_occasion: r.u_concierge_occasion,
      prompt_chat: r.u_prompt_chat,
      outlet_total: r.u_outlet_total,
      discount: r.u_discount,
      club_points: r.u_club_points,
      final_payable: r.u_final_payable,
      amount_due: r.u_amount_due,
      payment_status: r.u_payment_status,
      qr_image: r.u_qr_image,
      receipt: r.u_receipt,
      product_names: r.u_product_names,
      product_prices: r.u_product_prices,
      product_discounts: r.u_product_discounts,
      product_tax_percents: r.u_product_tax_percents,
      product_tax_values: r.u_product_tax_values,
      product_price_excl_tax: r.u_product_price_excl_tax,
      product_images: r.u_product_images,
      product_barcodes: r.u_product_barcodes,
      invoice_pdf: r.u_invoice_pdf,
      customer_address: r.u_customer_address,
      consumer_confirm: r.u_consumer_confirm,
      video_json: r.u_video_json,
      new_categories: r.u_new_categories,
    });
  }

  return base;
}

const SELECT_BLOCK = `
  SELECT
    b.booking_date               AS booking_date,
    b.id                         AS booking_id,
    d.id                         AS childid,
    DATE_FORMAT(d.start_time, '%h:%i %p') AS start_time,
    d.status                     AS detail_status,
    d.user_booking_date          AS user_booking_date,

    u.id                         AS u_id,
    u.booking_id                 AS u_booking_id,
    u.child_id                   AS u_child_id,
    u.user_id                    AS u_user_id,
    u.user_name                  AS u_user_name,
    u.booking_type               AS u_booking_type,
    u.pickup_location            AS u_pickup_location,
    u.delivery_location          AS u_delivery_location,
    u.phone                      AS u_phone,
    u.booking_date               AS u_booking_date,
    u.stylist_id                 AS u_stylist_id,
    u.stylist_name               AS u_stylist_name,
    u.rider_id                   AS u_rider_id,
    u.rider_name                 AS u_rider_name,
    u.vehicle_id                 AS u_vehicle_id,
    u.vehicle_name               AS u_vehicle_name,
    u.order_id                   AS u_order_id,
    u.order_status               AS u_order_status,
    u.appointment_status         AS u_appointment_status,
    u.created_at                 AS u_created_at,
    u.updated_at                 AS u_updated_at,
    u.society_id                 AS u_society_id,
    u.society_name               AS u_society_name,
    u.store_Id                   AS u_store_Id,
    u.store_name                 AS u_store_name,
    u.product_ids                AS u_product_ids,
    u.variant_ids                AS u_variant_ids,
    u.store_ids                  AS u_store_ids,
    u.seller_id                  AS u_seller_id,
    u.final_time                 AS u_final_time,
    u.nowlater                   AS u_nowlater,
    u.extra_notes                AS u_extra_notes,
    u.video_id                   AS u_video_id,

    -- Extended fields for "all bookings"
    u.concierge                  AS u_concierge,
    u.concierge_type             AS u_concierge_type,
    u.price_point_1              AS u_price_point_1,
    u.price_point_2              AS u_price_point_2,
    u.categories                 AS u_categories,
    u.colors                     AS u_colors,
    u.concierge_description      AS u_concierge_description,
    u.concierge_outlets          AS u_concierge_outlets,
    u.concierge_malls            AS u_concierge_malls,
    u.price_list                 AS u_price_list,
    u.body_types                 AS u_body_types,
    u.concierge_texture          AS u_concierge_texture,
    u.concierge_fabric           AS u_concierge_fabric,
    u.concierge_trends           AS u_concierge_trends,
    u.concierge_occasion         AS u_concierge_occasion,
    u.prompt_chat                AS u_prompt_chat,
    u.outlet_total               AS u_outlet_total,
    u.discount                   AS u_discount,
    u.club_points                AS u_club_points,
    u.final_payable              AS u_final_payable,
    u.amount_due                 AS u_amount_due,
    u.payment_status             AS u_payment_status,
    u.qr_image                   AS u_qr_image,
    u.receipt                    AS u_receipt,
    u.product_names              AS u_product_names,
    u.product_prices             AS u_product_prices,
    u.product_discounts          AS u_product_discounts,
    u.product_tax_percents       AS u_product_tax_percents,
    u.product_tax_values         AS u_product_tax_values,
    u.product_price_excl_tax     AS u_product_price_excl_tax,
    u.product_images             AS u_product_images,
    u.product_barcodes           AS u_product_barcodes,
    u.invoice_pdf                AS u_invoice_pdf,
    u.customer_address           AS u_customer_address,
    u.consumer_confirm           AS u_consumer_confirm,
    u.video_json                 AS u_video_json,
    u.new_categories             AS u_new_categories
  FROM soc_bookings b
  JOIN soc_bookings_details d ON d.booking_id = b.id
  JOIN soc_booking_user u     ON d.id = u.child_id
`;

async function socSellerBookings(req, res) {
  try {
    const seller_id = req.query.seller_id ?? req.params.seller_id;
    if (!seller_id) {
      return res.json({ error: true, message: "Seller ID is required." });
    }

    const [rows] = await pool.query(
      `${SELECT_BLOCK}
       WHERE u.store_ids = ?`,
      [seller_id]
    );

    if (!rows.length) {
      return res.json({
        error: true,
        message: "No data found for the given seller ID.",
      });
    }

    const mapped = rows.map((r) => mapRow(r));
    return res.json({ error: false, message: { rows: mapped } });
  } catch (err) {
    console.error("Error in socSellerBookings:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function socAllBookings(_req, res) {
  try {
    const [rows] = await pool.query(SELECT_BLOCK);

    if (!rows.length) {
      return res.json({ error: true, message: "No bookings found." });
    }

    const mapped = rows.map((r) => mapRow(r, true));
    return res.json({ error: false, message: { rows: mapped } });
  } catch (err) {
    console.error("Error in socAllBookings:", err);
    return res.json({ error: true, message: err.message });
  }
}

async function socOutletBookings(req, res) {
  try {
    const society_id =
      req.query.society_id ?? req.query.socity_id ?? req.params.society_id;

    if (!society_id) {
      return res.json({ rows: [] });
    }

    const [rows] = await pool.query(
      `
      SELECT
        b.booking_date                 AS booking_date,
        b.id                           AS booking_id,
        d.id                           AS childid,
        DATE_FORMAT(d.start_time, '%h:%i %p') AS start_time,
        d.status                       AS status,
        d.user_booking_date            AS user_booking_date,
        u.user_id                      AS user_id,
        u.booking_type                 AS booking_type
      FROM soc_bookings b
      JOIN soc_bookings_details d ON d.booking_id = b.id
      JOIN soc_booking_user u     ON d.id = u.child_id
      WHERE u.society_id = ?
      `,
      [society_id]
    );

    if (!rows.length) {
      return res.json({ rows: [] });
    }

    const childIds = [...new Set(rows.map((r) => r.childid))];

    const [infoRows] = await pool.query(
      `
      SELECT *
      FROM soc_booking_user
      WHERE society_id = ? AND child_id IN (${childIds
        .map(() => "?")
        .join(",")})
      `,
      [society_id, ...childIds]
    );

    const infoByChild = infoRows.reduce((acc, r) => {
      const k = r.child_id;
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
      return acc;
    }, {});

    const bulk = {
      rows: rows.map((r) => ({
        booking_date: r.booking_date,
        id: r.booking_id,
        childid: r.childid,
        start_time: r.start_time,
        status: r.status,
        user_booking_date: r.user_booking_date,
        booking_type: r.booking_type,
        booking_info: infoByChild[r.childid] ?? [],
      })),
    };

    return res.json(bulk);
  } catch (err) {
    console.error("Error in socOutletBookings:", err);
    return res.json({ rows: [], error: true, message: err.message });
  }
}

async function socOutletBookingsByDate(req, res) {
  try {
    const outlet_id =
      req.query.outlet_id ??
      req.query.society_id ??
      req.query.socity_id ??
      req.params.outlet_id;

    const date = req.query.date ?? req.params.date;

    if (!outlet_id) {
      return res.json({ rows: [] });
    }

    const [rows] = await pool.query(
      `
      SELECT
        b.booking_date                       AS booking_date,
        b.id                                 AS booking_id,
        d.id                                 AS childid,
        DATE_FORMAT(d.start_time, '%h:%i %p') AS start_time,
        DATE_FORMAT(u.final_time, '%h:%i %p') AS final_time,
        u.nowlater                           AS nowlater,
        d.status                             AS status,
        d.user_booking_date                  AS user_booking_date,
        u.user_id                            AS user_id,
        u.booking_type                       AS booking_type
      FROM soc_bookings b
      JOIN soc_bookings_details d ON d.booking_id = b.id
      JOIN soc_booking_user u     ON d.id = u.child_id
      WHERE u.society_id = ? AND b.booking_date = ?
      `,
      [outlet_id, date]
    );

    if (!rows.length) {
      return res.json({ rows: [] });
    }

    const childIds = [...new Set(rows.map((r) => r.childid))];

    const [infoRows] = await pool.query(
      `
      SELECT *
      FROM soc_booking_user
      WHERE society_id = ? AND child_id IN (${childIds
        .map(() => "?")
        .join(",")})
      `,
      [outlet_id, ...childIds]
    );

    const infoByChild = infoRows.reduce((acc, r) => {
      const k = r.child_id;
      if (!acc[k]) acc[k] = [];
      acc[k].push(r);
      return acc;
    }, {});

    const bulk = {
      rows: rows.map((r) => ({
        booking_date: r.booking_date,
        id: r.booking_id,
        childid: r.childid,
        start_time: r.start_time,
        final_time: r.final_time,
        nowlater: r.nowlater,
        status: r.status,
        user_booking_date: r.user_booking_date,
        booking_type: r.booking_type,
        booking_info: infoByChild[r.childid] ?? [],
      })),
    };

    return res.json(bulk);
  } catch (err) {
    console.error("Error in socOutletBookingsByDate:", err);
    return res.json({ rows: [], error: true, message: err.message });
  }
}

module.exports = {
  bookTour,
  updateTour,
  listOutletSlots,
  socUserBookings,
  socSellerBookings,
  socAllBookings,
  socOutletBookings,
  socOutletBookingsByDate,
};
