const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const { createOrder, updateOrder } = require("../database");
const {
    createTicketChannelPermissions,
} = require("../utils/permissions");
const { createTicketEmbed } = require("../utils/embeds");
const config = require("../config.json");

async function handleOrderInteraction(interaction) {
    // =========================
    // 🎫 CREATE ORDER BUTTON
    // =========================
    if (
        interaction.isButton() &&
        interaction.customId === "create_order"
    ) {
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("service_select")
                .setPlaceholder("Select a service type...")
                .addOptions(
                    config.services.map((service) => ({
                        label: service.label,
                        value: service.value,
                        emoji: service.emoji,
                    })),
                ),
        );

        return interaction.reply({
            content: "Please select the type of service you need:",
            components: [selectMenu],
            ephemeral: true,
        });
    }

    // =========================
    // 📌 SERVICE SELECT MENU
    // =========================
    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "service_select"
    ) {
        await interaction.deferReply({ ephemeral: true });

        const selectedService = interaction.values[0];
        const serviceConfig = config.services.find(
            (s) => s.value === selectedService,
        );

        if (!serviceConfig) {
            return interaction.editReply({
                content: "❌ Invalid service selection.",
            });
        }

        try {
            const categoryName = getCategoryName(selectedService);

            let category = interaction.guild.channels.cache.find(
                (c) =>
                    c.type === ChannelType.GuildCategory &&
                    c.name === categoryName,
            );

            if (!category) {
                category = await interaction.guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                });
            }

            const orderId = await createOrder(
                interaction.user.id,
                selectedService,
                null,
            );

            const channelName = `${selectedService.replace("_", "-")}-${orderId.split("-")[1]}`;

            const permissionOverwrites =
                createTicketChannelPermissions(
                    interaction.guild,
                    interaction.user,
                );

            permissionOverwrites.push({
                id: interaction.guild.members.me.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                ],
            });

            const ticketChannel =
                await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category,
                    permissionOverwrites,
                });

            await updateOrder(orderId, {
                channel_id: ticketChannel.id,
            });

            const embed = createTicketEmbed(
                serviceConfig.label,
                orderId,
                interaction.user,
            );

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_confirm_${orderId}`)
                    .setLabel("Confirm")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✅"),
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${orderId}`)
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("❌"),
            );

            await ticketChannel.send({
                content: `<@${interaction.user.id}> your ticket has been created`,
                embeds: [embed],
                components: [buttons],
            });

            await interaction.editReply({
                content: `✅ Ticket created successfully: ${ticketChannel}`,
            });
        } catch (error) {
            console.error("Order creation error:", error);

            await interaction.editReply({
                content:
                    "❌ Failed to create ticket. Please contact staff.",
            });
        }
    }
}

// =========================
// CATEGORY HELPER
// =========================
function getCategoryName(serviceValue) {
    const categoryMap = {
        paragon_leveling: config.categories.paragonLeveling,
        powerleveling: config.categories.powerleveling,
        gearing: config.categories.gearing,
        boss_kills: config.categories.bossKills,
        boss_mats: config.categories.bossMats,
        custom_order: config.categories.customOrder,
        hourly_diving: config.categories.hourlyDiving,
    };

    return categoryMap[serviceValue] || config.categories.customOrder;
}

module.exports = { handleOrderInteraction };
