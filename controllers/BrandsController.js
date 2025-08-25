// topBrands.controller.js
const db = require("../config/db"); // use the shared pool

async function getTopProductBrandsSimple() {
  // Fetch brands with product counts and ranking
  const [brands] = await db.query(`
    SELECT 
      b.id, b.name, b.image, b.banner1, b.banner2,
      COUNT(p.id) AS product_count,
      COUNT(DISTINCT p.seller_id) AS no_of_outlet,
      RANK() OVER (ORDER BY COUNT(p.id) DESC) AS rank
    FROM brands b
    LEFT JOIN products p ON b.name = p.brand
    GROUP BY b.id
    ORDER BY rank
  `);

  if (!brands.length) return [];

  const brandNames = brands.map((b) => b.name);

  // Fetch categories for the brands
  const [categories] = await db.query(
    `
    SELECT 
      p.brand,
      p.category_id, c1.name AS category_name,
      p.cat2 AS sub_category_id, c2.name AS sub_category_name,
      p.cat1 AS sub_sub_category_id, c3.name AS sub_sub_category_name
    FROM products p
    LEFT JOIN categories c1 ON p.category_id = c1.id
    LEFT JOIN categories c2 ON p.cat2 = c2.id
    LEFT JOIN categories c3 ON p.cat1 = c3.id
    WHERE p.brand IN (?)
  `,
    [brandNames]
  );

  // Map categories
  const catMap = {};
  const subCatMap = {};
  const subSubCatMap = {};

  categories.forEach((row) => {
    if (row.category_id) {
      if (!catMap[row.brand]) catMap[row.brand] = {};
      if (!catMap[row.brand][row.category_id])
        catMap[row.brand][row.category_id] = {
          category_id: row.category_id,
          category_name: row.category_name,
          product_count: 0,
        };
      catMap[row.brand][row.category_id].product_count++;
    }
    if (row.sub_category_id) {
      if (!subCatMap[row.brand]) subCatMap[row.brand] = {};
      if (!subCatMap[row.brand][row.sub_category_id])
        subCatMap[row.brand][row.sub_category_id] = {
          sub_category_id: row.sub_category_id,
          sub_category_name: row.sub_category_name,
          product_count: 0,
        };
      subCatMap[row.brand][row.sub_category_id].product_count++;
    }
    if (row.sub_sub_category_id) {
      if (!subSubCatMap[row.brand]) subSubCatMap[row.brand] = {};
      if (!subSubCatMap[row.brand][row.sub_sub_category_id])
        subSubCatMap[row.brand][row.sub_sub_category_id] = {
          sub_sub_category_id: row.sub_sub_category_id,
          sub_sub_category_name: row.sub_sub_category_name,
          product_count: 0,
        };
      subSubCatMap[row.brand][row.sub_sub_category_id].product_count++;
    }
  });

  // Fetch seller products
  const [sellerProducts] = await db.query(
    `
    SELECT brand, seller_id, COUNT(*) as total_product
    FROM products
    WHERE brand IN (?)
    GROUP BY brand, seller_id
  `,
    [brandNames]
  );

  const allSellerIds = [...new Set(sellerProducts.map((s) => s.seller_id))];
  let sellerDataMap = {};
  if (allSellerIds.length) {
    const [sellerData] = await db.query(
      `SELECT user_id, store_name, bulk_consumer FROM seller_data WHERE user_id IN (?)`,
      [allSellerIds]
    );
    sellerDataMap = Object.fromEntries(sellerData.map((s) => [s.user_id, s]));
  }

  // Map sellers to brands
  const brandSellerMap = {};
  sellerProducts.forEach((row) => {
    if (!brandSellerMap[row.brand]) brandSellerMap[row.brand] = [];
    brandSellerMap[row.brand].push({
      brand: row.brand,
      seller_id: row.seller_id,
      total_product: row.total_product,
      outlet_info: sellerDataMap[row.seller_id] || null,
    });
  });

  // Construct final result
  const result = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    image: brand.image,
    banner1: brand.banner1,
    banner2: brand.banner2,
    product_count: brand.product_count,
    product_categories: Object.values(catMap[brand.name] || {}),
    sub_categories: Object.values(subCatMap[brand.name] || {}),
    sub_sub_categories: Object.values(subSubCatMap[brand.name] || {}),
    no_of_outlet: brand.no_of_outlet,
    seller_info: brandSellerMap[brand.name] || [],
  }));

  return result;
}

module.exports = {
  getTopProductBrandsSimple,
};
