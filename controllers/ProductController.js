const sequelize = require("../config/dataBase");

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
    let { limit, offset, page, ...filters } = { ...req.query, ...req.body };

    limit = parseInt(limit, 10) || 10;
    offset = parseInt(offset, 10) || 0;

    if (page !== undefined) {
      page = parseInt(page, 10) || 1;
      offset = (page - 1) * limit;
    }

    // Exclude pagination/filter keys
    const excludedKeys = ["limit", "offset", "page", "min_price", "max_price", "search"];
    const filterKeys = Object.keys(filters).filter(k => !excludedKeys.includes(k));

    let baseQuery = `FROM products WHERE 1=1`;
    const replacements = [];

    if (req.body?.min_price !== undefined) {
      baseQuery += ` AND retail_simple_special_price >= ?`;
      replacements.push(req.body.min_price);
    }
    if (req.body?.max_price !== undefined) {
      baseQuery += ` AND retail_simple_special_price <= ?`;
      replacements.push(req.body.max_price);
    }

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

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await sequelize.query(countQuery, { replacements, type: sequelize.QueryTypes.SELECT });
    const total = countResult[0]?.total || 0;

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

    const productIds = products.map(p => p.id);
    const productMap = {};
    products.forEach(p => { productMap[p.id] = { ...p, variants: [] }; });

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
        const attrs = await getAttributeValues(ids);

        // Format variant like Zulu response
        productMap[variant.product_id].variants.push({
          ...variant,
          variant_ids: variant.attribute_value_ids,
          attr_name: attrs.map(a => ` ${a.name || a.value}`).join(","),
          variant_values: attrs.map(a => a.value).join(","),
          swatche_type: attrs[0]?.swatche_type || "0",
          swatche_value: attrs[0]?.swatche_value || "0",
          images_md: [],
          images_sm: [],
          variant_relative_path: [],
          cart_count: "0",
          statistics: {
            total_ordered: 0,
            total_favorites: 0,
            total_in_cart: 0,
            product_variant_id: variant.id.toString(),
          },
        });
      }
    }

    // Format final response
    const formattedProducts = Object.values(productMap).map(p => ({
      ...p,
      sales: "0",
      stock_type: "1",
      is_prices_inclusive_tax: "0",
      type: "simple_product",
      attr_value_ids: "",
      seller_rating: "0.0",
      seller_slug: "",
      seller_no_of_ratings: "0",
      seller_profile: "",
      store_name: "",
      store_description: "",
      seller_name: "",
      total_stock: p.variants.reduce((acc, v) => acc + Number(v.stock || 0), 0),
      min_max_price: {
        min_price: Math.min(...p.variants.map(v => v.price || 0)),
        max_price: Math.max(...p.variants.map(v => v.price || 0)),
        special_price: Math.min(...p.variants.map(v => v.special_price || 0)),
        max_special_price: Math.max(...p.variants.map(v => v.special_price || 0)),
        discount_in_percentage: null,
      },
      other_images_md: [],
      other_images_sm: [],
      details: [],
    }));

    return res.json({
      error: false,
      message: "Products retrieved successfully !",
      min_price: req.body?.min_price || 0,
      max_price: req.body?.max_price || 0,
      search: req.body?.search || "",
      filters: [], // You can populate filters if needed
      tags: [],
      total: total.toString(),
      offset: offset.toString(),
      data: formattedProducts,
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
