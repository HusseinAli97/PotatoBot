import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create new order
 */
export const createOrder = mutation({
    args: {
        orderId: v.string(),
        userId: v.string(),
        serviceType: v.string(),
        channelId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("orders", {
            orderId: args.orderId,
            userId: args.userId,
            serviceType: args.serviceType,
            status: "pending",
            createdAt: Date.now(),
            ...(args.channelId ? { channelId: args.channelId } : {}),
        });
    },
});

/**
 * Get order by orderId
 */
export const getOrderByOrderId = query({
    args: { orderId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("orders")
            .withIndex("by_orderId", (q) =>
                q.eq("orderId", args.orderId),
            )
            .first();
    },
});

/**update order */
export const updateOrder = mutation({
    args: {
        orderId: v.string(),
        data: v.any(),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("orders")
            .withIndex("by_orderId", (q) =>
                q.eq("orderId", args.orderId),
            )
            .first();

        if (!order) {
            throw new Error("Order not found");
        }

        await ctx.db.patch(order._id, {
            ...args.data,
        });
    },
});

export const deleteOrder = mutation({
    args: {
        orderId: v.string(),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db
            .query("orders")
            .withIndex("by_orderId", (q) =>
                q.eq("orderId", args.orderId),
            )
            .first();

        if (!order) return;

        await ctx.db.delete(order._id);
    },
});
