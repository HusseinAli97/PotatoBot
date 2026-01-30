const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = process.env.CONVEX_URL;

let convex = null;

if (CONVEX_URL) {
    convex = new ConvexHttpClient(CONVEX_URL);
    console.log("🟣 Convex client connected");
} else {
    console.warn("⚠️ CONVEX_URL not set, Convex disabled");
}

module.exports = { convex };
