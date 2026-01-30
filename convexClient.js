const { ConvexHttpClient } = require("convex/browser");

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

module.exports = convex;
