const convex = require("../convexClient");
const {
    getOrder: getSQLiteOrder,
    updateOrder: updateSQLiteOrder,
} = require("../database");

/* =========================
   GET ORDER
========================= */
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

/* =========================
   FIELD MAPPER
========================= */
function mapToConvexFields(data) {
    const mapped = {};

    if (data.battle_tag !== undefined)
        mapped.battleTag = data.battle_tag;

    if (data.pilot_type !== undefined)
        mapped.pilotType = data.pilot_type;

    if (data.express_type !== undefined)
        mapped.expressType = data.express_type;

    if (data.custom_order_details !== undefined)
        mapped.customOrderDetails = data.custom_order_details;

    if (data.payment_method !== undefined)
        mapped.paymentMethod = data.payment_method;

    if (data.status !== undefined) mapped.status = data.status;

    if (data.completed_at !== undefined)
        mapped.completedAt = Date.now();

    return mapped;
}

/* =========================
   UPDATE ORDER
========================= */
async function updateOrder(orderId, data) {
    try {
        if (!convex) throw new Error("Convex not available");

        const mappedData = mapToConvexFields(data);

        await convex.mutation("orders:updateOrder", {
            orderId,
            ...mappedData,
        });

        console.log("🟣 updateOrder in Convex:", orderId, mappedData);
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
