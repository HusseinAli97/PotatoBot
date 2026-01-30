const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
} = require("discord.js");

const { getOrder, updateOrder, deleteOrder } = require("../database");
const { createOrderDetailsEmbed } = require("../utils/embeds");
const config = require("../config.json");

async function handleTicketInteraction(interaction) {
    // =========================
    // BUTTONS
    // =========================
    if (interaction.isButton()) {
        const [action, type, orderId] =
            interaction.customId.split("_");
        if (action !== "ticket") return;

        // ✅ CONFIRM → MODAL ONLY (NO DEFER)
        if (type === "confirm") {
            return handleTicketConfirm(interaction, orderId);
        }

        // باقي الأزرار
        await interaction.deferReply({ ephemeral: true });

        if (type === "close")
            return handleTicketClose(interaction, orderId);
        if (type === "cancel")
            return handleStaffCancel(interaction, orderId);
        if (type === "complete")
            return handleStaffComplete(interaction, orderId);
    }

    // =========================
    // MODAL SUBMIT
    // =========================
    if (interaction.isModalSubmit()) {
        const orderId = interaction.customId.replace(
            "order_form_",
            "",
        );
        await interaction.deferReply({ ephemeral: true });
        return handleOrderForm(interaction, orderId);
    }

    // =========================
    // PAYMENT SELECT
    // =========================
    if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("payment_method_")
    ) {
        const orderId = interaction.customId.replace(
            "payment_method_",
            "",
        );
        await interaction.deferReply({ ephemeral: true });
        return handlePaymentMethodSelection(interaction, orderId);
    }
}

/* =========================
   CLOSE TICKET
========================= */
async function handleTicketClose(interaction, orderId) {
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.editReply({
            content: "❌ Order not found.",
        });
    }

    await deleteOrder(orderId);

    await interaction.editReply({
        content: "🗑️ This ticket will be deleted in 5 seconds...",
    });

    setTimeout(() => {
        interaction.channel.delete().catch(() => {});
    }, 5000);
}

/* =========================
   CONFIRM (MODAL)
========================= */
async function handleTicketConfirm(interaction, orderId) {
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.reply({
            content: "❌ Order not found.",
            ephemeral: true,
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`order_form_${orderId}`)
        .setTitle("Order Details");

    const battleTagInput = new TextInputBuilder()
        .setCustomId("battle_tag")
        .setLabel("Battle Tag")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const pilotInput = new TextInputBuilder()
        .setCustomId("pilot_type")
        .setLabel("Pilot or Self-play?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const expressInput = new TextInputBuilder()
        .setCustomId("express_type")
        .setLabel("Normal or Express?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const components = [
        new ActionRowBuilder().addComponents(battleTagInput),
        new ActionRowBuilder().addComponents(pilotInput),
        new ActionRowBuilder().addComponents(expressInput),
    ];

    // ✅ Custom Order فقط
    if (order.service_type === "custom_order") {
        const customDetailsInput = new TextInputBuilder()
            .setCustomId("custom_order_details")
            .setLabel("Describe your custom order")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
                "Please describe exactly what you want...",
            )
            .setRequired(true);

        components.push(
            new ActionRowBuilder().addComponents(customDetailsInput),
        );
    }

    modal.addComponents(...components);

    // ✅ أول وأوحد رد
    await interaction.showModal(modal);
}

/* =========================
   ORDER FORM SUBMIT
========================= */
async function handleOrderForm(interaction, orderId) {
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.editReply({
            content: "❌ Order not found.",
        });
    }

    const updateData = {
        battle_tag:
            interaction.fields.getTextInputValue("battle_tag"),
        pilot_type:
            interaction.fields.getTextInputValue("pilot_type"),
        express_type:
            interaction.fields.getTextInputValue("express_type"),
        status: "confirmed",
    };

    // ✅ Custom Order Details
    if (order.service_type === "custom_order") {
        updateData.custom_order_details =
            interaction.fields.getTextInputValue(
                "custom_order_details",
            );
    }

    await updateOrder(orderId, updateData);

    const updatedOrder = await getOrder(orderId);
    const user = await interaction.client.users.fetch(
        updatedOrder.user_id,
    );
    const embed = createOrderDetailsEmbed(updatedOrder, user);

    await interaction.channel.send({
        content: "📦 Order confirmed!",
        embeds: [embed],
    });

    const paymentSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`payment_method_${orderId}`)
            .setPlaceholder("Select your payment method...")
            .addOptions([
                {
                    label: "PayPal",
                    value: "paypal",
                    emoji: "💳",
                },
                {
                    label: "Crypto",
                    value: "crypto",
                    emoji: "🪙",
                },
                {
                    label: "Western Union",
                    value: "western_union",
                    emoji: "💵",
                },
            ]),
    );

    await interaction.channel.send({
        content: "✅ Please select your payment method below:",
        components: [paymentSelect],
    });
    await interaction.editReply({
        content: "✅ Order confirmed successfully.",
    });
}

/* =========================
   STAFF CANCEL
========================= */
async function handleStaffCancel(interaction, orderId) {
    const staffRole = interaction.guild.roles.cache.find(
        (r) => r.name === config.roleNames.staff,
    );

    if (
        !staffRole ||
        !interaction.member.roles.cache.has(staffRole.id)
    ) {
        return interaction.editReply({
            content: "❌ You do not have permission.",
        });
    }

    await updateOrder(orderId, { status: "cancelled" });

    await interaction.editReply({
        content:
            "🚫 Order cancelled. Channel will be deleted in 5 seconds.",
    });

    setTimeout(() => {
        interaction.channel.delete().catch(() => {});
    }, 5000);
}

/* =========================
   STAFF COMPLETE
========================= */
async function handleStaffComplete(interaction, orderId) {
    const staffRole = interaction.guild.roles.cache.find(
        (r) => r.name === config.roleNames.staff,
    );

    if (
        !staffRole ||
        !interaction.member.roles.cache.has(staffRole.id)
    ) {
        return interaction.editReply({
            content: "❌ You do not have permission.",
        });
    }

    await updateOrder(orderId, {
        status: "completed",
        completed_at: new Date().toISOString(),
    });

    await interaction.editReply({
        content: "✅ Order marked as completed.",
    });
}

/* =========================
   PAYMENT METHOD
========================= */
async function handlePaymentMethodSelection(interaction, orderId) {
    const paymentMethod = interaction.values[0];

    await updateOrder(orderId, { payment_method: paymentMethod });

    await interaction.editReply({
        content: `✅ Payment method selected: **${paymentMethod}**`,
    });
}

module.exports = {
    handleTicketInteraction,
};
