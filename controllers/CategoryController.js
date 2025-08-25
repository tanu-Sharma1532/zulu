const db = require("../config/db");

function deepStringifyNumbers(obj) {
  if (Array.isArray(obj)) return obj.map(deepStringifyNumbers);
  if (obj && typeof obj === "object") {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number" && v !== null) res[k] = v.toString();
      else if (Array.isArray(v) || (typeof v === "object" && v !== null))
        res[k] = deepStringifyNumbers(v);
      else res[k] = v;
    }
    return res;
  }
  return obj;
}

function getImageUrl(path, imageType = "", imageSize = "", fileType = "image") {
  const baseUrl = "https://zulushop.in/";
  if (!path) return baseUrl + "assets/no-image.png";
  if (/^https?:\/\//.test(path)) return path;
  let subdirectory = "";
  const segments = path.split("/");
  for (let i = 0; i < segments.length - 1; i++)
    subdirectory += segments[i] + "/";
  const imageName = segments[segments.length - 1];
  let imageMainDir = baseUrl + subdirectory;
  if (fileType === "image") {
    if (
      ["thumb", "cropped"].includes(imageType.trim().toLowerCase()) &&
      ["md", "sm"].includes(imageSize.trim().toLowerCase())
    ) {
      return imageMainDir + imageType + "-" + imageSize + "/" + imageName;
    }
    return imageMainDir + imageName;
  }
  return baseUrl + "assets/no-image.png";
}

function normalizeCountArr(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0)
    return [{ product_count: "0" }];
  return arr.map((obj) => ({
    product_count: (obj.product_count ?? "0").toString(),
  }));
}
function nullIfEmpty(arr) {
  return !arr || !Array.isArray(arr) || arr.length === 0
    ? null
    : arr.map((obj) => ({
        product_count: (obj.product_count ?? "0").toString(),
      }));
}

async function getCategories({
  id,
  limit = 25,
  offset = 0,
  sort = "row_order",
  order = "ASC",
  has_child_or_item = "true",
  slug = "",
  ignore_status = "",
  seller_id = "",
}) {
  let where = [];
  let params = [];
  if (ignore_status == 1) {
    if (id) {
      where.push("c1.id = ?");
      params.push(id);
    } else {
      where.push("c1.parent_id = 0");
    }
  } else {
    if (id) {
      where.push("c1.id = ? AND c1.status = 1");
      params.push(id);
    } else {
      where.push("c1.parent_id = 0 AND c1.status = 1");
    }
  }
  if (slug) {
    where.push("c1.slug = ?");
    params.push(slug);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const baseQuery = `SELECT c1.* FROM categories c1 ${whereClause} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));
  const [categories] = await db.query(baseQuery, params);

  const [allCategories] = await db.query(
    `SELECT * FROM categories WHERE status = 1`
  );
  const [[{ grandTotal }]] = await db.query(
    `SELECT COUNT(*) as grandTotal FROM categories WHERE status = 1`
  );

  const [subCatCounts] = await db.query(
    `SELECT cat2 AS id, COUNT(id) AS product_count FROM products WHERE cat2 IS NOT NULL GROUP BY cat2`
  );
  const [subSubCatCounts] = await db.query(
    `SELECT cat1 AS id, COUNT(id) AS product_count FROM products WHERE cat1 IS NOT NULL GROUP BY cat1`
  );
  const [catSumCounts] = await db.query(
    `SELECT category_id AS id, COUNT(id) AS product_count FROM products WHERE category_id IS NOT NULL GROUP BY category_id`
  );

  const subCatMap = Object.fromEntries(
    subCatCounts.map((row) => [
      row.id,
      [{ product_count: row.product_count.toString() }],
    ])
  );
  const subSubCatMap = Object.fromEntries(
    subSubCatCounts.map((row) => [
      row.id,
      [{ product_count: row.product_count.toString() }],
    ])
  );
  const catSumMap = Object.fromEntries(
    catSumCounts.map((row) => [
      row.id,
      [{ product_count: row.product_count.toString() }],
    ])
  );

  const childrenMap = {};
  allCategories.forEach((cat) => {
    if (!childrenMap[cat.parent_id]) childrenMap[cat.parent_id] = [];
    childrenMap[cat.parent_id].push(cat);
  });

  function buildCategoryTree(cat, level = 0) {
    return deepStringifyNumbers({
      ...cat,
      children: (childrenMap[cat.id] || []).map((child) =>
        buildCategoryTree(child, level + 1)
      ),
      text: cat.name,
      state: { opened: true },
      icon: "jstree-folder",
      level,
      relative_path: cat.image,
      image: getImageUrl(cat.image, "thumb", "sm"),
      banner: getImageUrl(cat.banner, "thumb", "md"),
      select_category: normalizeCountArr(catSumMap[cat.id]),
      sub_category: nullIfEmpty(subCatMap[cat.id]),
      sub_sub_category: normalizeCountArr(subSubCatMap[cat.id]),
    });
  }

  const result = categories.map((cat) => buildCategoryTree(cat, 0));
  if (result[0]) result[0].total = grandTotal;

  return result;
}

async function getPopularCategories() {
  const [rows] = await db.query(
    `SELECT * FROM categories ORDER BY clicks DESC`
  );
  return rows.map(deepStringifyNumbers);
}

module.exports = {
  getCategories,
  getPopularCategories,
};