import { ConvexHttpClient } from "convex/browser";
import "dotenv/config";

const client = new ConvexHttpClient(process.env.CONVEX_URL);

async function test() {
    await client.mutation("orders:createOrder", {
        orderId: "TEST-ORDER-001",
        userId: "123456789",
        serviceType: "custom_order",
    });

    console.log("✅ Convex createOrder works!");
}

test().catch(console.error);
