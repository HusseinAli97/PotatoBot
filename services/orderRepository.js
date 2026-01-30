const convex = require("../convexClient");
const {
    getOrder: getSQLiteOrder,
    updateOrder: updateSQLiteOrder,
} = require("../database");

async function getOrder(orderId) {
    try {
        if (!convex) throw new Error("Convex not available");

        const order = await convex.query("orders:getOrderByOrderId", {
            orderId,
        });

        if (order) {
            console.log("🟣 getOrder from Convex:", orderId);
            return order;
        }
    } catch (err) {
        console.warn(
            "⚠️ Convex getOrder failed, fallback to SQLite:",
            err.message,
        );
    }

    const sqliteOrder = await getSQLiteOrder(orderId);
    console.log("🟢 getOrder from SQLite:", orderId);
    return sqliteOrder;
}

async function updateOrder(orderId, data) {
    try {
        if (!convex) throw new Error("Convex not available");

        await convex.mutation("orders:updateOrder", {
            orderId,
            data,
        });

        console.log("🟣 updateOrder in Convex:", orderId, data);
        return;
    } catch (err) {
        console.warn(
            "⚠️ Convex updateOrder failed, fallback to SQLite:",
            err.message,
        );
    }

    await updateSQLiteOrder(orderId, data);
    console.log("🟢 updateOrder in SQLite:", orderId, data);
}

module.exports = {
    getOrder,
    updateOrder,
};
