const db = require("../config/db");

const BASE_URL = "https://zulushop.in/";

function getImageUrl(path) {
  if (!path) return "";
  return path.startsWith("http") ? path : BASE_URL + path.replace(/^\/+/, "");
}

function parseImages(imagesStr) {
  if (!imagesStr) return [];
  let arr;
  try {
    arr = JSON.parse(imagesStr);
  } catch {
    arr = [];
  }
  return (arr || []).map(getImageUrl);
}

function asString(val, def = "") {
  if (val === undefined || val === null) return def;
  return String(val);
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function uniqueArray(arr) {
  return [...new Set(arr)].filter(Boolean);
}

function discountPercent(special, price) {
  if (!special || !price) return null;
  const s = Number(special),
    p = Number(price);
  if (!s || !p) return null;
  return Math.round(((p - s) / p) * 100);
}

async function getSettings(type = "system_settings", isJson = false) {
  const [rows] = await db.query("SELECT * FROM settings WHERE variable = ?", [
    type,
  ]);
  if (!rows.length) return null;
  return isJson ? JSON.parse(rows[0].value) : rows[0].value;
}

async function getPrice() {
  const [rows] = await db.query(`
    SELECT IF(pv.special_price > 0, pv.special_price, pv.price) AS pr_price
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN seller_data sd ON p.seller_id = sd.user_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_attributes pa ON pa.product_id = p.id
    WHERE p.status = 1 AND pv.status = 1 AND sd.status = 1 AND (c.status = 1 OR c.status = 0)
  `);
  if (!rows.length) return { min: 0, max: 0 };
  const prices = rows.map((r) => Number(r.pr_price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

async function getMinMaxPriceOfProduct(product_id) {
  const [rows] = await db.query(
    `
    SELECT p.is_prices_inclusive_tax, pv.price, pv.special_price, tax.percentage as tax_percentage
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN taxes tax ON tax.id = p.tax
    WHERE p.id = ?
  `,
    [product_id]
  );
  if (!rows.length)
    return {
      min_price: "0",
      max_price: "0",
      special_price: "0",
      max_special_price: "0",
      discount_in_percentage: null,
    };
  const prices = rows.map((r) => Number(r.price));
  const specials = rows.map((r) => Number(r.special_price));
  const p = rows[0];
  const percent = Number(p.tax_percentage || 0);
  const incTax = Number(p.is_prices_inclusive_tax || 0);
  let price_tax_amount = 0,
    special_price_tax_amount = 0;
  if ((incTax === 0 || isNaN(incTax)) && percent > 0) {
    price_tax_amount = prices[0] * (percent / 100);
    special_price_tax_amount = specials[0] * (percent / 100);
  }
  const min_price = Math.min(...prices) + price_tax_amount;
  const max_price = Math.max(...prices) + price_tax_amount;
  const min_special = Math.min(...specials) + special_price_tax_amount;
  const max_special = Math.max(...specials) + special_price_tax_amount;
  const discount = discountPercent(min_special, min_price);
  return {
    min_price: asString(min_price),
    max_price: asString(max_price),
    special_price: asString(min_special),
    max_special_price: asString(max_special),
    discount_in_percentage: discount,
  };
}

async function getAttributeValuesByPid(id) {
  const [rows] = await db.query(
    `
      SELECT 
        GROUP_CONCAT(av.id ORDER BY av.id ASC) AS ids,
        GROUP_CONCAT(av.value ORDER BY av.id ASC SEPARATOR ' ') AS value,
        a.name AS attr_name,
        a.name,
        GROUP_CONCAT(av.swatche_type ORDER BY av.id ASC) AS swatche_type,
        GROUP_CONCAT(av.swatche_value ORDER BY av.id ASC) AS swatche_value
      FROM product_attributes pa
      INNER JOIN attribute_values av ON FIND_IN_SET(av.id, pa.attribute_value_ids) > 0
      INNER JOIN attributes a ON a.id = av.attribute_id
      WHERE pa.product_id = ?
      GROUP BY a.name
    `,
    [id]
  );
  return rows || [];
}

async function getAttributeValuesById(ids) {
  if (!ids.length) return [];
  const inClause = ids.map(() => "?").join(",");
  const [rows] = await db.query(
    `
      SELECT 
        GROUP_CONCAT(av.value ORDER BY av.id ASC) AS attribute_values,
        GROUP_CONCAT(av.id ORDER BY av.id ASC) AS attribute_values_id,
        a.name,
        GROUP_CONCAT(av.swatche_type ORDER BY av.id ASC) AS swatche_type,
        GROUP_CONCAT(av.swatche_value ORDER BY av.id ASC) AS swatche_value
      FROM attribute_values av
      INNER JOIN attributes a ON av.attribute_id = a.id
      WHERE av.id IN (${inClause})
      GROUP BY a.name
    `,
    ids
  );
  return rows || [];
}

async function getVariantsBatch(productIds, status = [1]) {
  if (!productIds.length) return [];
  const inClause = productIds.map(() => "?").join(",");
  const statusClause = status.map(() => "?").join(",");
  const [rows] = await db.query(
    `
      SELECT 
        pv.*,
        pv.product_id,
        GROUP_CONCAT(av.id ORDER BY av.id ASC) AS variant_ids,
        GROUP_CONCAT(a.name ORDER BY av.id ASC SEPARATOR ' ') AS attr_name,
        GROUP_CONCAT(av.value ORDER BY av.id ASC) AS variant_values,
        pv.price,
        GROUP_CONCAT(av.swatche_type ORDER BY av.id ASC) AS swatche_type,
        GROUP_CONCAT(av.swatche_value ORDER BY av.id ASC) AS swatche_value
      FROM product_variants pv
      LEFT JOIN attribute_values av ON FIND_IN_SET(av.id, pv.attribute_value_ids) > 0
      LEFT JOIN attributes a ON a.id = av.attribute_id
      WHERE pv.product_id IN (${inClause}) AND pv.status IN (${statusClause})
      GROUP BY pv.id
      ORDER BY pv.product_id, pv.id
    `,
    [...productIds, ...status]
  );
  return rows;
}

async function getDetailsBatch(productIds) {
  if (!productIds.length) return [];
  const inClause = productIds.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT id, product_category_shop, bar_code_number, bar_code_source, bulk_quantity, bulk_moq, bulk_price, bulk_discount, size_type, size_chart, size_wise_inventory, fabric1, fabric2, image, bulk_on_off, retail_on_off, outlet_type, try_home, payment_terms, primary_category, secondary_category, cat1, cat2, instant_delivery, try_at_home, tailor_at_home, premium_gifting, made_to_measure, size_chart_image, size_chart_description, with_zulu, trial_price, location_id, sub_location_id, video_tour
    FROM products WHERE id IN (${inClause})`,
    productIds
  );
  const map = {};
  for (let r of rows) {
    if (!map[r.id]) map[r.id] = [];
    map[r.id].push([r]);
  }
  return map;
}

async function fetchProduct(params = {}) {
  try {
    let {
      user_id,
      filter = {},
      id,
      category_id,
      limit,
      offset,
      sort,
      order,
      return_count,
      is_deliverable,
      seller_id,
      seller_ids,
      is_detailed_data = 0,
      zipcode,
      sub_category_id,
      sub_sub_category_id,
      product_ids,
    } = params;

    const settings = await getSettings("system_settings", true);
    const low_stock_limit = settings?.low_stock_limit || 5;

    let wheres = [],
      joins = [],
      sqlParams = [];

    joins.push(`LEFT JOIN categories c ON p.category_id = c.id`);
    joins.push(`LEFT JOIN brands b ON p.brand = b.name`);
    joins.push(`LEFT JOIN users u ON p.seller_id = u.id`);
    joins.push(`LEFT JOIN product_variants pv ON p.id = pv.product_id`);
    joins.push(`LEFT JOIN taxes tax ON tax.id = p.tax`);
    joins.push(`LEFT JOIN product_attributes pa ON pa.product_id = p.id`);
    joins.push(
      `LEFT JOIN seller_data sd ON p.seller_id = sd.user_id AND sd.outlet_live = 'on'`
    );

    if (filter.show_only_active_products === 0) {
    } else {
      wheres.push(`p.status = 1 AND pv.status = 1 AND sd.status = 1`);
    }
    if (filter.with_zulu && String(filter.with_zulu).toLowerCase() === "1")
      wheres.push(`p.with_zulu = 1`);
    if (filter.at_home && String(filter.at_home).toLowerCase() === "on")
      wheres.push(`p.try_at_home = 'on'`);

    if (filter.slug) {
      wheres.push(`p.slug = ?`);
      sqlParams.push(filter.slug);
    }
    if (seller_id) {
      wheres.push(`p.seller_id = ?`);
      sqlParams.push(seller_id);
    }
    if (seller_ids) {
      let arr = seller_ids
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      wheres.push(`p.seller_id IN (${arr.map(() => "?").join(",")})`);
      sqlParams.push(...arr);
    }
    if (id) {
      if (Array.isArray(id)) {
        wheres.push(`p.id IN (${id.map(() => "?").join(",")})`);
        sqlParams.push(...id);
      } else {
        wheres.push(`p.id = ?`);
        sqlParams.push(id);
      }
    }
    if (category_id) {
      let arr = Array.isArray(category_id)
        ? category_id
        : String(category_id).split(",");
      wheres.push(
        `(p.category_id IN (${arr
          .map(() => "?")
          .join(",")}) OR c.parent_id IN (${arr.map(() => "?").join(",")}))`
      );
      sqlParams.push(...arr, ...arr);
    }
    if (sub_category_id) {
      let arr = Array.isArray(sub_category_id)
        ? sub_category_id
        : String(sub_category_id).split(",");
      wheres.push(`p.cat2 IN (${arr.map(() => "?").join(",")})`);
      sqlParams.push(...arr);
    }
    if (sub_sub_category_id) {
      let arr = Array.isArray(sub_sub_category_id)
        ? sub_sub_category_id
        : String(sub_sub_category_id).split(",");
      wheres.push(`p.cat1 IN (${arr.map(() => "?").join(",")})`);
      sqlParams.push(...arr);
    }
    if (filter.min_price)
      wheres.push(`IF(pv.special_price > 0, pv.special_price, pv.price) >= ?`),
        sqlParams.push(filter.min_price);
    if (filter.max_price)
      wheres.push(`IF(pv.special_price > 0, pv.special_price, pv.price) <= ?`),
        sqlParams.push(filter.max_price);

    if (filter.search) {
      let tags = String(filter.search).split(" ");
      let tagLike = tags
        .map((tag) => `(p.tags LIKE ? OR p.name LIKE ? )`)
        .join(" OR ");
      wheres.push(`(${tagLike})`);
      for (let tag of tags) sqlParams.push(`%${tag}%`, `%${tag}%`);
    }
    if (filter.tags) {
      let tags = String(filter.tags).split(",");
      let tagLike = tags.map((tag) => `p.tags LIKE ?`).join(" OR ");
      wheres.push(`(${tagLike})`);
      for (let tag of tags) sqlParams.push(`%${tag}%`);
    }

    if (filter.brand) {
      let arr = Array.isArray(filter.brand)
        ? filter.brand
        : String(filter.brand)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (arr.length === 1) {
        wheres.push(`b.name = ?`);
        sqlParams.push(arr[0]);
      } else if (arr.length > 1) {
        wheres.push(`b.name IN (${arr.map(() => "?").join(",")})`);
        sqlParams.push(...arr);
      }
    }
    if (filter.product_variant_ids) {
      let arr = Array.isArray(filter.product_variant_ids)
        ? filter.product_variant_ids
        : String(filter.product_variant_ids)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      if (arr.length) {
        wheres.push(`pv.id IN (${arr.map(() => "?").join(",")})`);
        sqlParams.push(...arr);
      }
    }
    if (filter.show_only_stock_product === 1) {
      wheres.push(`(p.stock_type != '' OR pv.stock != '')`);
    }
    if (filter.discount && filter.discount !== "") {
      wheres.push(`pv.special_price > 0`);
    }
    if (
      filter.product_type &&
      filter.product_type.toLowerCase() === "most_selling_products"
    ) {
      joins.push("LEFT JOIN order_items oi ON oi.product_variant_id = pv.id");
    }
    if (filter.product_type && filter.product_type === "new_added_products") {
      sort = "p.id";
      order = "DESC";
    }
    if (
      filter.product_type &&
      (filter.product_type.toLowerCase() === "top_rated_products" ||
        filter.product_type === "top_rated_product_including_all_products")
    ) {
      sort = "p.rating";
      order = "DESC";
    }
    if (filter.flag && filter.flag === "low") {
      wheres.push(
        `((p.stock_type IS NOT NULL AND p.stock <= ?) OR (pv.stock <= ?))`
      );
      sqlParams.push(low_stock_limit, low_stock_limit);
    }
    if (filter.flag && filter.flag !== "low") {
      wheres.push(
        `((p.availability = 0 AND p.stock = 0) OR (pv.availability = 0 AND pv.stock = 0))`
      );
    }
    if (filter.attribute_value_ids) {
      let str = String(filter.attribute_value_ids).replace(/,/g, "|");
      wheres.push(
        `CONCAT(',', pv.attribute_value_ids, ',') REGEXP ',(${str}),'`
      );
    }
    if (filter.zipcode_id) {
      let zipcode_id = filter.zipcode_id;
      wheres.push(
        `((deliverable_type='2' AND FIND_IN_SET(?, deliverable_zipcodes)) OR deliverable_type='1' OR (deliverable_type='3' AND NOT FIND_IN_SET(?, deliverable_zipcodes)))`
      );
      sqlParams.push(zipcode_id, zipcode_id);
    }
    if (filter.city_id) {
      let city_id = filter.city_id;
      wheres.push(
        `((deliverable_city_type='2' AND FIND_IN_SET(?, deliverable_cities)) OR deliverable_city_type='1' OR (deliverable_city_type='3' AND NOT FIND_IN_SET(?, deliverable_cities)))`
      );
      sqlParams.push(city_id, city_id);
    }

    let sql = `
    SELECT 
      p.*, c.name AS category_name, b.slug AS brand_slug, u.username AS seller_name, 
      tax.percentage AS tax_percentage, tax.id AS tax_id, sd.rating AS seller_rating, 
      sd.slug AS seller_slug, sd.no_of_ratings AS seller_no_of_ratings, sd.logo AS seller_profile, 
      sd.store_name, sd.store_description, GROUP_CONCAT(DISTINCT(pa.attribute_value_ids)) as attr_value_ids
    FROM products p
    ${joins.join("\n")}
    ${wheres.length ? "WHERE " + wheres.join(" AND ") : ""}
    GROUP BY p.id
    ${
      sort
        ? `ORDER BY ${
            sort === "pv.price"
              ? "IFNULL((SELECT IF(pv2.special_price > 0, pv2.special_price, pv2.price) FROM product_variants pv2 WHERE pv2.product_id = p.id AND pv2.status = 1 ORDER BY IF(pv2.special_price > 0, pv2.special_price, pv2.price) ASC), 0)"
              : sort
          } ${order || "ASC"}`
        : "ORDER BY p.row_order ASC"
    }
    ${
      limit
        ? `LIMIT ${Number(limit)}${offset ? " OFFSET " + Number(offset) : ""}`
        : ""
    }
  `;

    const [rows] = await db.query(sql, sqlParams);

    const countParams = [...sqlParams];

    let countSql = `
  SELECT COUNT(DISTINCT p.id) as total
  FROM products p
  ${joins.join("\n")}
  ${wheres.length ? "WHERE " + wheres.join(" AND ") : ""}
`;

    console.log("COUNT SQL:", countSql, countParams);

    const [countRows] = await db.query(countSql, countParams);
    const totalCount = countRows[0]?.total || 0;
    // const totalCount = 550;

    let attr_value_ids = [];
    let tagsAll = [];
    let productIds = rows.map((p) => p.id);

    let variantsBatch = await getVariantsBatch(productIds);
    let variantsMap = {};
    for (let v of variantsBatch) {
      v.images = parseImages(v.images);
      v.images_md = v.images;
      v.images_sm = v.images;
      v.price = asString(v.price, "0");
      v.special_price = asString(v.special_price, "0");
      // v.variant_values = v.variant_values
      //   ? v.variant_values.split(",").map((x) => x.trim())
      //   : [];
      // v.attr_name = v.attr_name
      //   ? v.attr_name.split(",").map((x) => x.trim())
      //   : [];
      v.variant_values = asString(v.variant_values, "");
      v.attr_name = asString(v.attr_name, "");
      v.stock = asString(v.stock, "0");
      v.status = asString(v.status, "1");
      if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
      variantsMap[v.product_id].push(v);
    }
    let detailsMap = await getDetailsBatch(productIds);

    for (let p of rows) {
      p.image = getImageUrl(p.image);
      p.image_md = p.image;
      p.image_sm = p.image;
      p.other_images = parseImages(p.other_images);
      p.other_images_md = p.other_images;
      p.other_images_sm = p.other_images;
      p.seller_profile = getImageUrl(p.seller_profile);
      p.status = asString(p.status, "1");
      p.name = asString(p.name);
      p.slug = asString(p.slug);
      p.short_description = asString(p.short_description);
      p.description = asString(p.description);
      p.extra_description = asString(p.extra_description);
      p.pickup_location = asString(p.pickup_location);
      p.min_max_price = await getMinMaxPriceOfProduct(p.id);
      p.tags = parseTags(p.tags);
      tagsAll = tagsAll.concat(p.tags);
      if (p.attr_value_ids)
        attr_value_ids.push(...String(p.attr_value_ids).split(","));
      p.variants = variantsMap[p.id] || [];
      p.total_stock = p.variants.reduce(
        (sum, v) => sum + Number(v.stock || 0),
        0
      );
      // p.details = [];
      p.details = detailsMap[p.id] || [];
    }

    attr_value_ids = uniqueArray(attr_value_ids);
    let filters = attr_value_ids.length
      ? await getAttributeValuesById(attr_value_ids)
      : [];
    let prices = await getPrice();
    tagsAll = uniqueArray(tagsAll);

    return {
      min_price: asString(prices.min),
      max_price: asString(prices.max),
      search: filter.search || "",
      filters: filters,
      tags: tagsAll,
      total: asString(totalCount),
      offset: asString(offset || 0),
      product: rows,
    };
  } catch (e) {
    console.error("fetchProduct error:", e);
    return { min_price: 0, max_price: 0, product: [], filters: [] };
  }
}

async function getProductByBarcode(barcode) {
  if (!barcode) {
    return {
      error: true,
      message: "Barcode is required",
      data: null,
    };
  }

  let [rows] = await db.query(
    "SELECT id AS variant_id, product_id FROM product_variants WHERE zulu_bar_code = ? LIMIT 1",
    [barcode]
  );
  if (rows.length === 0) {
    [rows] = await db.query(
      "SELECT id AS variant_id, product_id FROM product_variants WHERE brand_bar_code = ? LIMIT 1",
      [barcode]
    );
  }

  if (rows.length > 0) {
    return {
      error: false,
      message: "Product variant found",
      data: rows[0],
    };
  } else {
    return {
      error: true,
      message: "No matching product variant found",
      data: null,
    };
  }
}

module.exports = {
  fetchProduct,
  getSettings,
  getPrice,
  getAttributeValuesByPid,
  getAttributeValuesById,
  getVariantsValuesByPid: async (id, status = [1]) => {
    const variants = await getVariantsBatch([id], status);
    return variants.filter((v) => v.product_id == id);
  },
  getMinMaxPriceOfProduct,
  getProductByBarcode,
};
