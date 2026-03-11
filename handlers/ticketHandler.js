const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
} = require("discord.js");

const {
    getOrder,
    updateOrder,
    deleteOrder,
} = require("../services/orderRepository");
const { createOrderDetailsEmbed } = require("../utils/embeds");
const config = require("../config.json");

async function handleTicketInteraction(interaction) {
    if (interaction.isButton()) {
        const [action, type, orderId] =
            interaction.customId.split("_");
        if (action !== "ticket") return;

        // Confirm → Modal (no defer)
        if (type === "confirm") {
            return handleTicketConfirm(interaction, orderId);
        }

        await interaction.deferReply({ ephemeral: true });

        if (type === "close")
            return handleTicketClose(interaction, orderId);
        if (type === "cancel")
            return handleStaffCancel(interaction, orderId);
        if (type === "complete")
            return handleStaffComplete(interaction, orderId);
        if (type === "paid")
            return handleClientPaid(interaction, orderId);
        if (type === "verify")
            return handleVerifyPayment(interaction, orderId);
    }

    if (interaction.isModalSubmit()) {
        const orderId = interaction.customId.replace(
            "order_form_",
            "",
        );
        await interaction.deferReply({ ephemeral: true });
        return handleOrderForm(interaction, orderId);
    }

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
ClintPaid
========================= */
async function handleClientPaid(interaction, orderId) {
    // 🔒 اقفل الزر فورًا
    await interaction.message.edit({ components: [] });

    // 🗂️ حدّث حالة الأوردر
    await updateOrder(orderId, {
        status: "payment_submitted",
    });

    const staffRole = interaction.guild.roles.cache.find(
        (r) => r.name === config.roleNames.staff,
    );

    const verifyBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_verify_${orderId}`)
            .setLabel("✅ Payment Verified")
            .setStyle(ButtonStyle.Success),
    );

    await interaction.channel.send({
        content: `💰 **Payment submitted** ${staffRole ? `<@&${staffRole.id}>` : ""}`,
        components: [verifyBtn],
    });

    await interaction.editReply({
        content:
            "✅ Payment has been processed, pending staff review.",
    });
}

/* =========================
   Staff Verify
========================= */
async function handleVerifyPayment(interaction, orderId) {
    const staffRole = interaction.guild.roles.cache.find(
        (r) => r.name === config.roleNames.staff,
    );

    if (
        !staffRole ||
        !interaction.member.roles.cache.has(staffRole.id)
    ) {
        return interaction.editReply({
            content: "❌ Staff only.",
        });
    }

    // 🧠 تأكد من حالة الأوردر
    const order = await getOrder(orderId);

    if (!order || order.status !== "payment_submitted") {
        return interaction.editReply({
            content:
                "❌ Payment is not submitted yet or already verified.",
        });
    }

    // ✅ تحديث الحالة
    await updateOrder(orderId, {
        status: "in_progress",
    });

    // 🔒 اقفل زر Verify
    await interaction.message.edit({ components: [] });

    await interaction.channel.send(
        "🚀 **Payment verified. Order is now IN PROGRESS.**",
    );

    await interaction.editReply({
        content: "✅ Order moved to IN PROGRESS.",
    });
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
    if (
        order.serviceType === "custom_order" ||
        order.service_type === "custom_order"
    ) {
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

    if (
        order.serviceType === "custom_order" ||
        order.service_type === "custom_order"
    ) {
        updateData.custom_order_details =
            interaction.fields.getTextInputValue(
                "custom_order_details",
            );
    }

    // 1️⃣ تحديث الأوردر
    await updateOrder(orderId, updateData);

    // 2️⃣ نجيب الأوردر بعد التحديث
    const updatedOrder = await getOrder(orderId);
    const user = await interaction.client.users.fetch(
        updatedOrder.userId || updatedOrder.user_id,
    );

    // 3️⃣ نعمل Embed واحد نستخدمه في كل مكان
    const embed = createOrderDetailsEmbed(updatedOrder, user);

    // =========================
    // 📢 STAFF NOTIFICATION
    // =========================
    const orderDetailsChannel = interaction.guild.channels.cache.find(
        (ch) =>
            ch.name === config.channelNames.ordersDetails ||
            ch.name === config.channelNames.ordersDetailsAlt,
    );

    const staffRole = interaction.guild.roles.cache.find(
        (r) => r.name === config.roleNames.staff,
    );

    if (orderDetailsChannel) {
        await orderDetailsChannel.send({
            content: staffRole
                ? `🚨 **New order confirmed!** <@&${staffRole.id}>`
                : "🚨 **New order confirmed!**",
            embeds: [embed],
        });
    }

    // =========================
    // 👤 MESSAGE TO CLIENT
    // =========================
    await interaction.channel.send({
        content: "📦 Order confirmed!",
        embeds: [embed],
    });

    // =========================
    // 💳 PAYMENT METHOD SELECT
    // =========================
    const paymentSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`payment_method_${orderId}`)
            .setPlaceholder("Select your payment method...")
            .addOptions(
                config.paymentMethods.map((pm) => ({
                    label: pm.label,
                    value: pm.value,
                    emoji: pm.emoji,
                })),
            ),
    );

    await interaction.channel.send({
        content: "✅ Please select your payment method below:",
        components: [paymentSelect],
    });

    // =========================
    // 🛠️ STAFF CONTROL BUTTONS
    // =========================
    const staffControls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_cancel_${orderId}`)
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌"),
        new ButtonBuilder()
            .setCustomId(`ticket_complete_${orderId}`)
            .setLabel("Complete")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅"),
    );

    // إرسال أزرار التحكم للستاف
    await interaction.channel.send({
        content: "🛠️ **Staff controls:**",
        components: [staffControls],
    });
    // 4️⃣ نقفل الـ modal interaction
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
    // =========================
    // 🔐 PERMISSION CHECK
    // =========================
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

    // =========================
    // 📦 GET ORDER
    // =========================
    const order = await getOrder(orderId);
    if (!order) {
        return interaction.editReply({
            content: "❌ Order not found.",
        });
    }

    // =========================
    // 🗄️ UPDATE DATABASE
    // =========================
    await updateOrder(orderId, {
        status: "completed",
        completed_at: new Date().toISOString(),
    });

    // =========================
    // 📅 CATEGORY (MONTH / YEAR)
    // =========================
    const now = new Date();
    const month = now.toLocaleString("en-US", { month: "short" });
    const year = now.getFullYear();

    const categoryName = `Completed Orders [${month}-${year}]`;

    let completedCategory = interaction.guild.channels.cache.find(
        (c) =>
            c.type === 4 && // GuildCategory
            c.name === categoryName,
    );

    if (!completedCategory) {
        completedCategory = await interaction.guild.channels.create({
            name: categoryName,
            type: 4,
        });
    }

    // =========================
    // 🚚 MOVE CHANNEL
    // =========================
    await interaction.channel.setParent(completedCategory.id);

    // =========================
    // 🔒 UPDATE PERMISSIONS
    // =========================

    // ❌ اخفاء القناة عن الجميع
    await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        {
            ViewChannel: false,
        },
    );

    // 👤 السماح للعميل بالقراءة فقط
    await interaction.channel.permissionOverwrites.edit(
        order.user_id,
        {
            ViewChannel: true,
            SendMessages: false,
            AddReactions: false,
        },
    );

    // 🧑‍💼 السماح للستاف
    if (staffRole) {
        await interaction.channel.permissionOverwrites.edit(
            staffRole.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            },
        );
    }

    // =========================
    // 🧹 DISABLE INTERACTIONS
    // =========================
    try {
        const messages = await interaction.channel.messages.fetch({
            limit: 10,
        });

        const botMessages = messages.filter(
            (m) =>
                m.author.id === interaction.client.user.id &&
                m.components.length > 0,
        );

        for (const msg of botMessages.values()) {
            await msg.edit({ components: [] });
        }
    } catch (e) {
        // تجاهل أي خطأ (اختياري)
    }

    // =========================
    // 📢 FINAL MESSAGES
    // =========================
    await interaction.channel.send(
        "📁 **Order completed and archived.**",
    );

    await interaction.editReply({
        content: "✅ Order marked as completed and archived.",
    });
}

/* =========================
   PAYMENT METHOD
========================= */
async function handlePaymentMethodSelection(interaction, orderId) {
    const paymentMethod = interaction.values[0];

    // 1️⃣ حفظ وسيلة الدفع (Convex → SQLite fallback)
    await updateOrder(orderId, {
        payment_method: paymentMethod,
    });

    // 2️⃣ نجيب بيانات الدفع من config
    const paymentData = config.paymentMethods.find(
        (pm) => pm.value === paymentMethod,
    );

    // 3️⃣ نرد على الاختيار
    await interaction.editReply({
        content: `✅ Payment method selected: **${paymentData?.label || paymentMethod}**`,
    });

    // 4️⃣ نعرض بيانات الدفع (زي زمان)
    if (paymentData?.info) {
        await interaction.channel.send({
            content: paymentData.info,
        });
    }
    const paidButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_paid_${orderId}`)
            .setLabel("💳 I Paid")
            .setStyle(ButtonStyle.Primary),
    );

    await interaction.channel.send({
        content: "👇 Click Here After u Pay",
        components: [paidButton],
    });
}

module.exports = {
    handleTicketInteraction,
};
