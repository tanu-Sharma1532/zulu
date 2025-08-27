const productsModel = require("../models/productsModel");

exports.getProducts = async (req, res) => {
  try {
    console.log("getProducts called, req.body:", req.body);

    const body = req.body || {};
    const filter = {};

    if (body.search !== undefined) filter.search = body.search;
    if (body.tags !== undefined) filter.tags = body.tags;
    if (body.attribute_value_ids !== undefined)
      filter.attribute_value_ids = body.attribute_value_ids;
    if (body.discount !== undefined) filter.discount = body.discount;
    if (body.top_rated_product === "1")
      filter.product_type = "top_rated_product";
    if (body.min_price !== undefined) filter.min_price = body.min_price;
    if (body.max_price !== undefined) filter.max_price = body.max_price;
    if (body.brand !== undefined) filter.brand = body.brand;
    if (body.express !== undefined) filter.express = body.express;
    if (body.with_zulu !== undefined) filter.with_zulu = body.with_zulu;
    if (body.show_only_active_products !== undefined)
      filter.show_only_active_products = Number(body.show_only_active_products);
    if (body.at_home !== undefined) filter.at_home = body.at_home;
    if (body.product_variant_ids !== undefined)
      filter.product_variant_ids = body.product_variant_ids;
    if (body.flag !== undefined) filter.flag = body.flag;
    if (body.zipcode_id !== undefined) filter.zipcode_id = body.zipcode_id;
    if (body.city_id !== undefined) filter.city_id = body.city_id;

    const id = body.product_ids
      ? Array.isArray(body.product_ids)
        ? body.product_ids
        : String(body.product_ids)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
      : undefined;

    const category_id = body.category_id
      ? String(body.category_id)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined;

    const sub_category_id = body.sub_category_id
      ? String(body.sub_category_id)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined;

    const sub_sub_category_id = body.sub_sub_category_id
      ? String(body.sub_sub_category_id)
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : undefined;

    const limit = body.limit !== undefined ? Number(body.limit) : 25;
    const offset = body.offset !== undefined ? Number(body.offset) : 0;
    const sort = body.sort || "p.row_order";
    const order = (body.order || "DESC").toUpperCase();
    const is_detailed_data = body.is_detailed_data == "1" ? 1 : 0;

    const user_id = body.user_id;
    const seller_id = body.seller_id;
    const seller_ids = body.seller_ids;

    console.log("Calling fetchProduct with:", {
      user_id,
      filter,
      id,
      category_id,
      limit,
      offset,
      sort,
      order,
      seller_id,
      seller_ids,
      is_detailed_data,
      sub_category_id,
      sub_sub_category_id,
    });

    const products = await productsModel.fetchProduct({
      user_id,
      filter,
      id,
      category_id,
      limit,
      offset,
      sort,
      order,
      seller_id,
      seller_ids,
      is_detailed_data,
      sub_category_id,
      sub_sub_category_id,
    });

    console.log(
      "fetchProduct returned:",
      Array.isArray(products.product)
        ? `Products: ${products.product.length}`
        : products.product
    );

    let tags = [];
    if (
      products.product &&
      Array.isArray(products.product) &&
      products.product.length
    ) {
      tags = products.product
        .reduce(
          (arr, p) =>
            arr.concat(
              p.tags
                ? typeof p.tags === "string"
                  ? p.tags.split(",")
                  : Array.isArray(p.tags)
                  ? p.tags
                  : []
                : []
            ),
          []
        )
        .map((t) => String(t).trim())
        .filter(Boolean)
        .filter((v, i, self) => self.indexOf(v) === i);
    }

    const response = {
      error: false,
      message: "Products retrieved successfully!",
      min_price: String(products.min_price || 0),
      max_price: String(products.max_price || 0),
      search: filter.search || "",
      filters: products.filters || [],
      tags,
      total: String(products.total ?? 0),
      offset: String(offset || 0),
      data: Array.isArray(products.product) ? products.product : [],
    };

    if (!Array.isArray(products.product) || !products.product.length) {
      response.error = true;
      response.message = "Products Not Found!";
      response.data = [];
      response.filters = [];
      response.tags = [];
      response.total = "0";
    }

    console.log("Response:", {
      ...response,
      data: `Array(${response.data.length})`,
    });

    res.json(response);
  } catch (e) {
    console.error("getProducts error:", e);
    res.status(500).json({ error: true, message: "Server Error", data: [] });
  }
};

exports.getProductByBarcode = async (req, res) => {
  const barcode = req.query.barcode || req.body.barcode;
  const result = await productsModel.getProductByBarcode(barcode);
  res.json(result);
};
