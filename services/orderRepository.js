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
            return normalizeOrder(order);
        }
    } catch (err) {
        console.warn(
            "⚠️ Convex getOrder failed, fallback to SQLite:",
            err.message,
        );
    }

    const sqliteOrder = await getSQLiteOrder(orderId);
    console.log("🟢 getOrder from SQLite:", orderId);
    return normalizeOrder(sqliteOrder);
}

/* =========================
   FIELD MAPPER (SQLite → Convex)
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

        // 🛑 مهم: لو مفيش حاجة تتحدث، بلاش نكلم Convex
        if (Object.keys(mappedData).length === 0) {
            console.warn("⚠️ No fields to update in Convex");
            return;
        }

        await convex.mutation("orders:updateOrder", {
            orderId,
            data: mappedData,
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

/* =========================
   NORMALIZER (Convex → App)
========================= */
function normalizeOrder(order) {
    if (!order) return null;

    return {
        ...order,
        battle_tag: order.battle_tag ?? order.battleTag ?? null,
        pilot_type: order.pilot_type ?? order.pilotType ?? null,
        express_type: order.express_type ?? order.expressType ?? null,
        custom_order_details:
            order.custom_order_details ??
            order.customOrderDetails ??
            null,
        payment_method:
            order.payment_method ?? order.paymentMethod ?? null,
        user_id: order.user_id ?? order.userId ?? null,
    };
}

module.exports = {
    getOrder,
    updateOrder,
};
