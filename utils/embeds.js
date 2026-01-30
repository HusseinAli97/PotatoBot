const { EmbedBuilder } = require("discord.js");
const config = require("../config.json");

/* =========================
   HELPERS
========================= */
const safe = (v) =>
    v !== undefined && v !== null && String(v).trim() !== ""
        ? String(v)
        : "—";

/* =========================
   MAIN ORDER EMBED
========================= */
function createOrderEmbed() {
    return new EmbedBuilder()
        .setTitle("🎮 PotatoBoosting - Order System")
        .setDescription(
            "Welcome to our professional boosting service! Click the button below to create your order.",
        )
        .setColor(0x5865f2)
        .addFields(
            {
                name: "📋 Available Services",
                value: config.services
                    .map((s) => `${s.emoji} ${s.label}`)
                    .join("\n"),
                inline: false,
            },
            {
                name: "⚡ Fast Service",
                value: "Professional and reliable boosting",
                inline: true,
            },
            {
                name: "🔒 Secure",
                value: "Your account safety is our priority",
                inline: true,
            },
            {
                name: "💬 Support",
                value: "Dedicated ticket system",
                inline: true,
            },
        )
        .setFooter({
            text: 'Click "Create Ticket / Order" to get started!',
        })
        .setTimestamp();
}

/* =========================
   TICKET EMBED
========================= */
function createTicketEmbed(serviceName, orderId, user) {
    return new EmbedBuilder()
        .setTitle(`🎫 ${safe(serviceName)} - Ticket`)
        .setDescription(
            `Order ID: \`${safe(orderId)}\`\n\nHello ${user}! Your ticket has been created. Please confirm your order to proceed or close if you've changed your mind.`,
        )
        .setColor(0x57f287)
        .addFields(
            {
                name: "📝 Next Steps",
                value: "• Click **Confirm** to fill out your order details\n• Click **Close** to cancel this ticket",
                inline: false,
            },
            {
                name: "⏰ Response Time",
                value: "Staff will respond within 15 minutes",
                inline: true,
            },
            {
                name: "🆔 Order ID",
                value: `\`${safe(orderId)}\``,
                inline: true,
            },
        )
        .setFooter({
            text: "PotatoBoosting - Professional Service",
        })
        .setTimestamp();
}

/* =========================
   ORDER DETAILS EMBED
========================= */
function createOrderDetailsEmbed(order, user) {
    const serviceConfig = config.services.find(
        (s) => s.value === order.service_type,
    );

    const embed = new EmbedBuilder()
        .setTitle(
            `📋 Order Details - ${
                serviceConfig?.label || safe(order.service_type)
            }`,
        )
        .setColor(0x5865f2)
        .addFields(
            {
                name: "🆔 Order ID",
                value: safe(order.order_id || order.orderId),
                inline: false,
            },
            {
                name: "👤 Customer",
                value: user
                    ? `${user.toString()} (${user.username})`
                    : "—",
                inline: false,
            },
            {
                name: "🎮 Service",
                value:
                    serviceConfig?.label || safe(order.service_type),
                inline: false,
            },
        )
        .setFooter({
            text: "PotatoBoosting - Order Management System",
        })
        .setTimestamp();

    /* -------- Core fields -------- */
    embed.addFields(
        {
            name: "⚔️ Battle Tag",
            value: safe(order.battle_tag),
            inline: false,
        },
        {
            name: "🕹️ Play Type",
            value: safe(order.pilot_type),
            inline: false,
        },
        {
            name: "⚡ Service Speed",
            value: safe(order.express_type),
            inline: false,
        },
    );

    /* -------- Service-specific -------- */
    if (
        (order.service_type === "powerleveling" ||
            order.service_type === "paragon_leveling") &&
        (order.from_level || order.to_level)
    ) {
        embed.addFields(
            {
                name: "📊 From Level",
                value: safe(order.from_level),
                inline: true,
            },
            {
                name: "🎯 To Level",
                value: safe(order.to_level),
                inline: true,
            },
        );
    }

    if (order.service_type === "boss_kills") {
        embed.addFields({
            name: "💀 Kills Needed",
            value: safe(order.kills_amount),
            inline: false,
        });
    }

    if (order.service_type === "boss_mats") {
        embed.addFields({
            name: "💎 Materials Needed",
            value: safe(order.mats_amount),
            inline: false,
        });
    }

    if (order.service_type === "custom_order") {
        embed.addFields({
            name: "📝 Custom Requirements",
            value: safe(
                order.custom_description ||
                    order.custom_order_details,
            ),
            inline: false,
        });
    }

    /* -------- Status & time -------- */
    embed.addFields(
        {
            name: "📊 Status",
            value: safe(order.status).toUpperCase(),
            inline: false,
        },
        {
            name: "📅 Created",
            value: order.created_at
                ? `<t:${Math.floor(
                      new Date(order.created_at).getTime() / 1000,
                  )}:R>`
                : "—",
            inline: false,
        },
    );

    return embed;
}

module.exports = {
    createOrderEmbed,
    createTicketEmbed,
    createOrderDetailsEmbed,
};
