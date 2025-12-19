const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
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
        const [action, type, orderId] = interaction.customId.split("_");
        if (action !== "ticket") return;

        // ❗ لازم defer هنا
        await interaction.deferReply({ flags: 64 });

        if (type === "close") return handleTicketClose(interaction, orderId);
        if (type === "confirm") return handleTicketConfirm(interaction, orderId);
        if (type === "cancel") return handleStaffCancel(interaction, orderId);
        if (type === "complete") return handleStaffComplete(interaction, orderId);
    }

    // =========================
    // MODAL SUBMIT
    // =========================
    if (interaction.isModalSubmit()) {
        const orderId = interaction.customId.replace("order_form_", "");
        await interaction.deferReply({ flags: 64 });
        return handleOrderForm(interaction, orderId);
    }

    // =========================
    // PAYMENT SELECT
    // =========================
    if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("payment_method_")
    ) {
        const orderId = interaction.customId.replace("payment_method_", "");
        await interaction.deferReply({ flags: 64 });
        return handlePaymentMethodSelection(interaction, orderId);
    }
}

/* =========================
   CLOSE TICKET
========================= */
async function handleTicketClose(interaction, orderId) {
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.editReply({ content: "❌ Order not found." });
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
        return interaction.editReply({ content: "❌ Order not found." });
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

    modal.addComponents(
        new ActionRowBuilder().addComponents(battleTagInput),
        new ActionRowBuilder().addComponents(pilotInput),
        new ActionRowBuilder().addComponents(expressInput)
    );

    // ❗ modal فقط بدون reply
    await interaction.showModal(modal);
}

/* =========================
   ORDER FORM
========================= */
async function handleOrderForm(interaction, orderId) {
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.editReply({ content: "❌ Order not found." });
    }

    const updateData = {
        battle_tag: interaction.fields.getTextInputValue("battle_tag"),
        pilot_type: interaction.fields.getTextInputValue("pilot_type"),
        express_type: interaction.fields.getTextInputValue("express_type"),
        status: "confirmed",
    };

    await updateOrder(orderId, updateData);

    const updatedOrder = await getOrder(orderId);
    const user = await interaction.client.users.fetch(updatedOrder.user_id);
    const embed = createOrderDetailsEmbed(updatedOrder, user);

    await interaction.channel.send({
        content: "📦 Order confirmed!",
        embeds: [embed],
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
        r => r.name === config.roleNames.staff
    );

    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
        return interaction.editReply({
            content: "❌ You do not have permission.",
        });
    }

    await updateOrder(orderId, { status: "cancelled" });

    await interaction.editReply({
        content: "🚫 Order cancelled. Channel will be deleted in 5 seconds.",
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
        r => r.name === config.roleNames.staff
    );

    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
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
