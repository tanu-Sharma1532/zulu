const sequelize = require("../config/dataBase"); // Sequelize instance

let cachedAttributeValues = null;

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
    let { limit = 10, offset = 0, ...filters } = req.body || {};
    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);

    if (isNaN(limit) || isNaN(offset)) {
      return res.status(400).json({ error: "limit and offset must be numeric" });
    }

    // Base query
    let query = `
      SELECT id, name, seller_id, priority, image, brand, 
             retail_simple_price, description, 
             retail_simple_special_price, cat2, cat1, category_id
      FROM products
      WHERE 1=1
    `;
    const replacements = [];

    // Price filters
    if (filters.min_price) {
      query += ` AND retail_simple_special_price >= ?`;
      replacements.push(filters.min_price);
    }
    if (filters.max_price) {
      query += ` AND retail_simple_special_price <= ?`;
      replacements.push(filters.max_price);
    }

    // Other filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && !["min_price", "max_price"].includes(key)) {
        if (Array.isArray(value) && value.length) {
          query += ` AND ${key} IN (${value.map(() => "?").join(",")})`;
          replacements.push(...value);
        } else {
          query += ` AND ${key} = ?`;
          replacements.push(value);
        }
      }
    }

    query += ` ORDER BY priority DESC, id DESC LIMIT ${limit} OFFSET ${offset}`; // use direct numbers here

    const [products] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    if (!products.length) return res.json({ products: [] });

    // Variants
    const productIds = products.map(p => p.id);
    const [variants] = await sequelize.query(
      `SELECT id, product_id, attribute_value_ids, stock
       FROM product_variants
       WHERE product_id IN (${productIds.map(() => "?").join(",")})
       ORDER BY variant_rank ASC`,
      { replacements: productIds, type: sequelize.QueryTypes.SELECT }
    );

    const productMap = {};
    products.forEach(p => { productMap[p.id] = { ...p, variants: [] }; });

    for (let variant of variants) {
      const ids = variant.attribute_value_ids
        ? variant.attribute_value_ids.split(",").map(Number)
        : [];
      variant.attributes = await getAttributeValues(ids);
      productMap[variant.product_id].variants.push(variant);
    }

    return res.json({ products: Object.values(productMap) });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { getProducts };
