const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ChannelType,
    StringSelectMenuBuilder,
} = require("discord.js");
const { getOrder, updateOrder, deleteOrder } = require("../database");
const { createOrderDetailsEmbed } = require("../utils/embeds");
const config = require("../config.json");
const fetch = require("node-fetch");

async function handleTicketInteraction(interaction) {
    if (interaction.isButton()) {
        const [action, type, orderId] = interaction.customId.split("_");

        if (action === "ticket") {
            if (type === "close") {
                await handleTicketClose(interaction, orderId);
            } else if (type === "confirm") {
                await handleTicketConfirm(interaction, orderId);
            } else if (type === "cancel") {
                await handleStaffCancel(interaction, orderId);
            } else if (type === "complete") {
                await handleStaffComplete(interaction, orderId);
            }
        }
    } else if (interaction.isModalSubmit()) {
        const orderId = interaction.customId.replace("order_form_", "");
        await handleOrderForm(interaction, orderId);
    } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId.startsWith("payment_method_")
    ) {
        const orderId = interaction.customId.replace("payment_method_", "");
        await handlePaymentMethodSelection(interaction, orderId);
    }
}

async function handleTicketClose(interaction, orderId) {
    try {
        const order = await getOrder(orderId);
        if (!order) {
            await interaction.reply({
                content: "❌ Order not found.",
                ephemeral: true,
            });
            return;
        }

        // Delete the order from database
        await deleteOrder(orderId);

        // Delete the channel after a short delay
        await interaction.reply({
            content: "🗑️ This ticket will be deleted in 5 seconds...",
        });

        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error(
                    "Error deleting channel:",
                    error
                );
            }
        }, 5000);
    } catch (error) {
        console.error("Error closing ticket: - ticketHandler.js:74", error);
        await interaction.reply({
            content: "❌ Failed to close the ticket.",
            ephemeral: true,
        });
    }
}

async function handleTicketConfirm(interaction, orderId) {
    const order = await getOrder(orderId);
    const serviceType = order.service_type;

    const modal = new ModalBuilder()
        .setCustomId(`order_form_${orderId}`)
        .setTitle("Order Details");

    // Core inputs for all services
    const battleTagInput = new TextInputBuilder()
        .setCustomId("battle_tag")
        .setLabel("Battle Tag")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your Battle Tag (e.g., PlayerName#1234)")
        .setRequired(true);

    const pilotInput = new TextInputBuilder()
        .setCustomId("pilot_type")
        .setLabel("Pilot or Self-play?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Pilot / Self-play")
        .setRequired(true);

    const expressInput = new TextInputBuilder()
        .setCustomId("express_type")
        .setLabel("Normal or Super Express?")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Normal / Super Express")
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(battleTagInput);
    const secondActionRow = new ActionRowBuilder().addComponents(pilotInput);
    const thirdActionRow = new ActionRowBuilder().addComponents(expressInput);

    // Service-specific inputs
    if (serviceType === "powerleveling" || serviceType === "paragon_leveling") {
        const fromLevelInput = new TextInputBuilder()
            .setCustomId("from_level")
            .setLabel("From Level")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Current level")
            .setRequired(true);

        const toLevelInput = new TextInputBuilder()
            .setCustomId("to_level")
            .setLabel("To Level")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Target level")
            .setRequired(true);

        const fourthActionRow = new ActionRowBuilder().addComponents(
            fromLevelInput
        );
        const fifthActionRow = new ActionRowBuilder().addComponents(
            toLevelInput
        );

        modal.addComponents(
            firstActionRow,
            secondActionRow,
            thirdActionRow,
            fourthActionRow,
            fifthActionRow
        );
    } else if (serviceType === "boss_kills") {
        const killsInput = new TextInputBuilder()
            .setCustomId("kills_amount")
            .setLabel("How many kills do you want?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Number of kills")
            .setRequired(true);

        const fourthActionRow = new ActionRowBuilder().addComponents(
            killsInput
        );
        modal.addComponents(
            firstActionRow,
            secondActionRow,
            thirdActionRow,
            fourthActionRow
        );
    } else if (serviceType === "boss_mats") {
        const matsInput = new TextInputBuilder()
            .setCustomId("mats_amount")
            .setLabel("How many mats do you want?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Number of materials")
            .setRequired(true);

        const fourthActionRow = new ActionRowBuilder().addComponents(matsInput);
        modal.addComponents(
            firstActionRow,
            secondActionRow,
            thirdActionRow,
            fourthActionRow
        );
    } else if (serviceType === "hourly_diving") {
        const hoursInput = new TextInputBuilder()
            .setCustomId("hours_amount")
            .setLabel("How many hours do you need?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g., 2 or 5")
            .setRequired(true);

        const fourthActionRow = new ActionRowBuilder().addComponents(
            hoursInput
        );

        modal.addComponents(
            firstActionRow,
            secondActionRow,
            thirdActionRow,
            fourthActionRow
        );
    } else if (serviceType === "custom_order") {
        const descriptionInput = new TextInputBuilder()
            .setCustomId("custom_description")
            .setLabel("Describe what you want")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Please describe your custom order requirements...")
            .setRequired(true);

        const fourthActionRow = new ActionRowBuilder().addComponents(
            descriptionInput
        );
        modal.addComponents(
            firstActionRow,
            secondActionRow,
            thirdActionRow,
            fourthActionRow
        );
    } else if (serviceType === "gearing") {
        // Gearing only uses core inputs
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);
    }

    await interaction.showModal(modal);
}

async function handleOrderForm(interaction, orderId) {
    try {
        const order = await getOrder(orderId);
        const serviceType = order.service_type;

        // Core fields for all services
        const battleTag = interaction.fields.getTextInputValue("battle_tag");
        const pilotType = interaction.fields.getTextInputValue("pilot_type");
        const expressType =
            interaction.fields.getTextInputValue("express_type");

        let updateData = {
            battle_tag: battleTag,
            pilot_type: pilotType,
            express_type: expressType,
            status: "confirmed",
        };

        // Service-specific fields
        if (
            serviceType === "powerleveling" ||
            serviceType === "paragon_leveling"
        ) {
            const fromLevel =
                interaction.fields.getTextInputValue("from_level");
            const toLevel = interaction.fields.getTextInputValue("to_level");
            updateData.from_level = fromLevel;
            updateData.to_level = toLevel;
        } else if (serviceType === "hourly_diving") {
            const hoursAmount =
                interaction.fields.getTextInputValue("hours_amount");
            updateData.hours_amount = hoursAmount;
        } else if (serviceType === "boss_kills") {
            const killsAmount =
                interaction.fields.getTextInputValue("kills_amount");
            updateData.kills_amount = killsAmount;
        } else if (serviceType === "boss_mats") {
            const matsAmount =
                interaction.fields.getTextInputValue("mats_amount");
            updateData.mats_amount = matsAmount;
        } else if (serviceType === "custom_order") {
            const customDescription =
                interaction.fields.getTextInputValue("custom_description");
            updateData.custom_description = customDescription;
        }

        // Update order in database
        await updateOrder(orderId, updateData);
        const updatedOrder = await getOrder(orderId);

        const user = await interaction.client.users.fetch(updatedOrder.user_id);

        // Create order details embed
        const embed = createOrderDetailsEmbed(updatedOrder, user);

        // Find roles and channels
        const staffRole = interaction.guild.roles.cache.find(
            (role) => role.name === config.roleNames.staff
        );

        // Try multiple ways to find the order-details channel
        let ordersDetailsChannel = interaction.guild.channels.cache.find(
            (channel) => channel.name === config.channelNames.ordersDetails
        );

        // If not found, try alternative names
        if (!ordersDetailsChannel) {
            ordersDetailsChannel = interaction.guild.channels.cache.find(
                (channel) =>
                    channel.name === config.channelNames.ordersDetailsAlt
            );
        }

        // If still not found, try partial matching
        if (!ordersDetailsChannel) {
            ordersDetailsChannel = interaction.guild.channels.cache.find(
                (channel) =>
                    channel.name.toLowerCase().includes("order") &&
                    channel.name.toLowerCase().includes("detail")
            );
        }

        // List all channels for debugging
        console.log("All channels in server: - ticketHandler.js:304");
        interaction.guild.channels.cache.forEach((channel) => {
            if (channel.type === 0) {
                // Text channels only
                console.log(
                    `Channel: "${channel.name}"`
                );
            }
        });

        console.log(
            "Staff role found:",
            staffRole ? staffRole.name : "Not found"
        );
        console.log(
            "Orders details channel found:",
            ordersDetailsChannel ? ordersDetailsChannel.name : "Not found"
        );
        console.log(
            "Looking for channel name:",
            config.channelNames.ordersDetails
        );

        // Send single notification to order-details channel
        if (ordersDetailsChannel) {
            try {
                await ordersDetailsChannel.send({
                    content: "New order received and confirmed",
                    embeds: [embed],
                });
                console.log(
                    "Successfully sent to orderdetails channel"
                );
            } catch (error) {
                console.error(
                    "Error sending to orderdetails channel:",
                    error
                );
            }
        } else {
            console.error(
                "orderdetails channel not found!"
            );
        }

        // Send direct messages to all staff members
        if (staffRole) {
            try {
                const serviceConfig = config.services.find(
                    (s) => s.value === updatedOrder.service_type
                );
                const staffMembers = interaction.guild.members.cache.filter(
                    (member) =>
                        member.roles.cache.has(staffRole.id) && !member.user.bot
                );

                const staffDMEmbed = createOrderDetailsEmbed(updatedOrder, user)
                    .setColor(0xff0000) // Red color for staff notifications
                    .setTitle(
                        `🚨 NEW ORDER - ${
                            serviceConfig
                                ? serviceConfig.label
                                : updatedOrder.service_type
                        }`
                    )
                    .addFields({
                        name: "🔔 Staff Notification",
                        value: "New order requires your attention",
                        inline: false,
                    });

                staffMembers.forEach(async (member) => {
                    try {
                        await member.send({
                            content:
                                "New order notification from PotatoBoosting",
                            embeds: [staffDMEmbed],
                        });
                        console.log(
                            `Sent DM to staff member: ${member.user.tag}`
                        );
                    } catch (dmError) {
                        console.log(
                            `Could not send DM to ${member.user.tag}: ${dmError.message}`
                        );
                    }
                });

                console.log(
                    `Attempted to send DM notifications to ${staffMembers.size} staff members`
                );
            } catch (error) {
                console.error(
                    "Error sending staff DM notifications:",
                    error
                );
            }
        }

        // Create staff control buttons
        const staffButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_cancel_${orderId}`)
                .setLabel("Cancel")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("❌"),
            new ButtonBuilder()
                .setCustomId(`ticket_complete_${orderId}`)
                .setLabel("Complete")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✅")
        );

        // Create payment method selection menu
        const paymentSelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`payment_method_${orderId}`)
                .setPlaceholder("Select your payment method...")
                .addOptions(
                    config.paymentMethods.map((method) => ({
                        label: method.label,
                        value: method.value,
                        emoji: method.emoji,
                    }))
                )
        );

        // Update the ticket channel with order details, payment selection, and staff buttons
        await interaction.reply({
            content:
                "✅ Order confirmed! Please select your payment method below:",
            embeds: [embed],
            components: [paymentSelectMenu, staffButtons],
        });
    } catch (error) {
        console.error(
            "Error processing order form:",
            error
        );
        await interaction.reply({
            content: "❌ Failed to process your order. Please try again.",
            ephemeral: true,
        });
    }
}

async function handleStaffCancel(interaction, orderId) {
    // Check if user has staff role
    const staffRole = interaction.guild.roles.cache.find(
        (role) => role.name === config.roleNames.staff
    );
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
        await interaction.reply({
            content: "❌ You do not have permission to cancel orders.",
            ephemeral: true,
        });
        return;
    }

    try {
        const order = await getOrder(orderId);
        if (!order) {
            await interaction.reply({
                content: "❌ Order not found.",
                ephemeral: true,
            });
            return;
        }

        // Update order status
        await updateOrder(orderId, { status: "cancelled" });

        // Notify staff
        await interaction.reply({
            content: `🚫 Order ${orderId} has been cancelled by ${interaction.user}. This channel will be deleted in 10 seconds.`,
        });

        // Delete channel after delay
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error(
                    "Error deleting cancelled order channel:",
                    error
                );
            }
        }, 5000);
    } catch (error) {
        console.error("Error cancelling order: - ticketHandler.js:493", error);
        await interaction.reply({
            content: "❌ Failed to cancel the order.",
            ephemeral: true,
        });
    }
}

async function handleStaffComplete(interaction, orderId) {
    // ✅ تحقق من صلاحية المستخدم
    const staffRole = interaction.guild.roles.cache.find(
        (role) => role.name === config.roleNames.staff
    );
    if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
        await interaction.reply({
            content: "❌ You do not have permission to complete orders.",
            ephemeral: true,
        });
        return;
    }

    try {
        // 🧾 استرجاع الطلب من قاعدة البيانات
        const order = await getOrder(orderId);
        if (!order) {
            await interaction.reply({
                content: "❌ Order not found.",
                ephemeral: true,
            });
            return;
        }

        // 🧾 تحديث حالة الطلب إلى مكتمل
        await updateOrder(orderId, {
            status: "completed",
            completed_at: new Date().toISOString(),
        });

        // 🧩 البحث عن أو إنشاء كاتيجوري الأوردرات المكتملة
        const baseCategoryName =
            config.categories.completedOrders || "✅ Completed Orders";
        const now = new Date();
        const month = now.toLocaleString("en-US", { month: "short" }); // Oct
        const year = now.getFullYear();

        // ابحث عن الكاتيجوري الأساسية
        let completedCategory = interaction.guild.channels.cache.find(
            (c) =>
                c.type === ChannelType.GuildCategory &&
                c.name === baseCategoryName
        );

        // لو مش موجودة، أنشئها
        if (!completedCategory) {
            completedCategory = await interaction.guild.channels.create({
                name: baseCategoryName,
                type: ChannelType.GuildCategory,
            });
            console.log(
                `✅ Created base category: ${baseCategoryName}`
            );
        }

        // ✅ تحقق من الحد الأقصى (50 قناة في الكاتيجوري)
        if (completedCategory.children.cache.size >= 50) {
            // شوف لو في كاتيجوري شهرية موجودة
            let monthlyCategory = interaction.guild.channels.cache.find(
                (c) =>
                    c.type === ChannelType.GuildCategory &&
                    c.name === `${baseCategoryName} [${month}-${year}]`
            );

            // لو مش موجودة، أنشئها تحت القديمة مباشرة
            if (!monthlyCategory) {
                monthlyCategory = await interaction.guild.channels.create({
                    name: `${baseCategoryName} [${month}-${year}]`,
                    type: ChannelType.GuildCategory,
                    position: completedCategory.position + 1, // ⬅️ تجعلها تحت القديمة مباشرة
                });
                console.log(
                    `✅ Created new monthly category: ${monthlyCategory.name}`
                );
            }

            completedCategory = monthlyCategory;
        }

        // 🚚 نقل القناة إلى الكاتيجوري المحددة
        await interaction.channel.setParent(completedCategory);
        console.log(
            `📁 Order ${orderId} moved to ${completedCategory.name}`
        );

        // 💬 رسالة التأكيد في القناة
        await interaction.reply({
            content: `✅ Order ${orderId} has been marked as completed by ${interaction.user}. Customer access will be revoked in 4 hours.`,
        });

        // ⏰ إزالة صلاحية المستخدم بعد 4 ساعات + إرسال رسالة مراجعة
        setTimeout(async () => {
            try {
                const user = await interaction.client.users.fetch(
                    order.user_id
                );

                // حذف صلاحية المستخدم من القناة
                await interaction.channel.permissionOverwrites.delete(user);

                // البحث عن قناة المراجعات
                const reviewsChannel = interaction.guild.channels.cache.find(
                    (channel) => channel.name === config.channelNames.reviews
                );

                if (reviewsChannel) {
                    const reviewButton = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setLabel("Leave a Review")
                            .setStyle(ButtonStyle.Link)
                            .setURL(
                                `https://discord.com/channels/${interaction.guild.id}/${reviewsChannel.id}`
                            )
                            .setEmoji("⭐")
                    );

                    await user
                        .send({
                            content: `✅ Your order ${orderId} has been completed!\nWe'd love to hear your feedback.\nPlease leave a review in the ${reviewsChannel.name} channel:`,
                            components: [reviewButton],
                        })
                        .catch((error) => {
                            console.log(
                                `⚠️ Could not send review message to ${user.tag}: ${error.message}`
                            );
                        });
                } else {
                    console.log(
                        "⚠️ Reviews channel not found."
                    );
                }
            } catch (error) {
                console.error(
                    "Error in completion cleanup:",
                    error
                );
            }
        }, config.completionDelay || 4 * 60 * 60 * 1000); // 4 ساعات افتراضيًا
    } catch (error) {
        console.error("Error completing order: - ticketHandler.js:640", error);
        await interaction.reply({
            content: "❌ Failed to complete the order.",
            ephemeral: true,
        });
    }
}

async function handlePaymentMethodSelection(interaction, orderId) {
    try {
        const serverId = interaction.guild.id;
        const paymentMethod = interaction.values[0];
        const paymentConfig = config.paymentMethods.find(
            (p) => p.value === paymentMethod
        );

        if (!paymentConfig) {
            await interaction.reply({
                content: "❌ Invalid payment method selection.",
                ephemeral: true,
            });
            return;
        }

        // Update order in database with selected payment method
        await updateOrder(orderId, {
            payment_method: paymentMethod,
        });
        const updatedOrder = await getOrder(orderId); // استرجاع الطلب بالكامل
        // Send simple message with payment information
        await interaction.reply({
            content: `✅ Payment method selected: **${paymentConfig.label}**\n\n${paymentConfig.info}`,
            ephemeral: false,
        });
    } catch (error) {
        console.error(
            "Error handling payment method selection:",
            error
        );
        await interaction.reply({
            content:
                "❌ Failed to process payment method selection. Please try again.",
            ephemeral: true,
        });
    }
}

module.exports = {
    handleTicketInteraction,
};
