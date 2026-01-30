import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    orders: defineTable({
        orderId: v.string(), // ORD-XXXX
        userId: v.string(), // Discord user id
        serviceType: v.string(), // paragon_leveling, custom_order...
        channelId: v.optional(v.string()),

        battleTag: v.optional(v.string()),
        pilotType: v.optional(v.string()),
        expressType: v.optional(v.string()),
        customOrderDetails: v.optional(v.string()),

        paymentMethod: v.optional(v.string()),

        status: v.string(), // pending | confirmed | completed
        createdAt: v.number(), // Date.now()
        completedAt: v.optional(v.number()),
    })
        .index("by_orderId", ["orderId"])
        .index("by_status", ["status"]),
});
