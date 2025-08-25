const sequelize = require("../config/dataBase");

let cachedAttributeValues = null;

// Fetch attribute values from external API (cached)
async function getAttributeValues(attributeValueIds = []) {
  if (!attributeValueIds.length) return [];
  if (!cachedAttributeValues) {
    try {
      const res = await fetch("https://app.zulu.club/api/tagged-video-product/formdata");
      if (!res.ok) return [];
      const data = await res.json();
      cachedAttributeValues = data.data?.attributeValues || [];
    } catch (err) {
      console.error("Error fetching attribute values:", err);
      return [];
    }
  }
  const idsSet = new Set(attributeValueIds.map(Number));
  return cachedAttributeValues.filter(av => idsSet.has(av.id));
}

const getProducts = async (req, res) => {
  try {
    // Support both query params and POST body
    let { limit, offset, page, ...filters } = { ...req.query, ...req.body };

    limit = parseInt(limit, 10) || 10;
    offset = parseInt(offset, 10) || 0;

    if (page !== undefined) {
      page = parseInt(page, 10) || 1;
      offset = (page - 1) * limit;
    }

    if (isNaN(limit) || isNaN(offset)) {
      return res.status(400).json({ error: "limit and offset must be numeric" });
    }

    // Remove pagination keys from filters
    const excludedKeys = ["limit", "offset", "page", "min_price", "max_price"];
    const filterKeys = Object.keys(filters).filter(k => !excludedKeys.includes(k));

    let baseQuery = `FROM products WHERE 1=1`;
    const replacements = [];

    // Price filters
    if (req.body?.min_price !== undefined) {
      baseQuery += ` AND retail_simple_special_price >= ?`;
      replacements.push(req.body.min_price);
    }
    if (req.body?.max_price !== undefined) {
      baseQuery += ` AND retail_simple_special_price <= ?`;
      replacements.push(req.body.max_price);
    }

    // Other filters (exact match)
    for (const key of filterKeys) {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length) {
          baseQuery += ` AND ${key} IN (${value.map(() => "?").join(",")})`;
          replacements.push(...value);
        } else {
          baseQuery += ` AND ${key} = ?`;
          replacements.push(value);
        }
      }
    }

    // Count total products
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await sequelize.query(countQuery, { replacements, type: sequelize.QueryTypes.SELECT });
    const total = countResult[0]?.total || 0;

    // Fetch products with pagination
    const productsQuery = `
      SELECT id, name, seller_id, priority, image, brand,
             retail_simple_price, retail_simple_special_price,
             description, cat1, cat2, category_id
      ${baseQuery}
      ORDER BY priority DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    const products = await sequelize.query(productsQuery, {
      replacements: [...replacements, limit, offset],
      type: sequelize.QueryTypes.SELECT,
    });

    if (!products.length) return res.json({ products: [], totalItems: total, totalPages: 0, currentPage: Math.floor(offset / limit) + 1, limit });

    const productIds = products.map(p => p.id);
    const productMap = {};
    products.forEach(p => { productMap[p.id] = { ...p, variants: [] }; });

    // Fetch variants
    if (productIds.length) {
      const variantsQuery = `
        SELECT id, product_id, attribute_value_ids, price, special_price, sku,
               stock, weight, height, breadth, length, images, size_des, variant_rank
        FROM product_variants
        WHERE product_id IN (${productIds.map(() => "?").join(",")})
        ORDER BY variant_rank ASC
      `;
      const variants = await sequelize.query(variantsQuery, { replacements: productIds, type: sequelize.QueryTypes.SELECT });

      for (let variant of variants) {
        const ids = variant.attribute_value_ids
          ? variant.attribute_value_ids.split(",").map(Number)
          : [];
        variant.attributes = await getAttributeValues(ids);
        productMap[variant.product_id].variants.push(variant);
      }
    }

    return res.json({
      products: Object.values(productMap),
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page || Math.floor(offset / limit) + 1,
      limit,
    });

  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ error: true, message: "Something went wrong", details: err.message });
  }
};

module.exports = { getProducts };
