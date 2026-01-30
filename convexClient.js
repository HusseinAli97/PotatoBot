import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.CONVEX_URL);

export default convex;
