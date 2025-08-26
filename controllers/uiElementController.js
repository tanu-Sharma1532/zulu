const path = require("path");
const fs = require("fs");

const getUiElement = (req, res) => {
  try {
    const filePath = path.join(__dirname, "../data/get_ui_element.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(rawData);
    res.json(jsonData);
  } catch (err) {
    console.error("Error reading get_ui_element.json:", err);
    res.status(500).json({ error: "Failed to load UI element data" });
  }
};

module.exports = { getUiElement };
