const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createOrder } = require("../database");
const { createTicketChannelPermissions } = require("../utils/permissions");
const { createTicketEmbed } = require("../utils/embeds");
const config = require("../config.json");

async function handleOrderInteraction(interaction) {
    if (interaction.isButton() && interaction.customId === "create_order") {
        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("service_select")
                .setPlaceholder("Select a service type...")
                .addOptions(
                    config.services.map((service) => ({
                        label: service.label,
                        value: service.value,
                        emoji: service.emoji,
                    }))
                )
        );

        const reply = await interaction.reply({
            content: "Please select the type of service you need:",
            components: [selectMenu],
            ephemeral: true,
        });

        setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
    } else if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "service_select"
    ) {
        const selectedService = interaction.values[0];
        const serviceConfig = config.services.find(
            (s) => s.value === selectedService
        );

        if (!serviceConfig) {
            const reply = await interaction.reply({
                content: "❌ Invalid service selection.",
                ephemeral: true,
            });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
            return;
        }

        try {
            const reply = await interaction.reply({
                content: "🎫 Creating your ticket, please wait...",
                ephemeral: true,
            });
            setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);

            const categoryName = getCategoryName(selectedService);
            let category = interaction.guild.channels.cache.find(
                (c) =>
                    c.type === ChannelType.GuildCategory &&
                    c.name === categoryName
            );

            if (!category) {
                try {
                    category = await interaction.guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory,
                    });
                } catch (error) {
                    const botMember = interaction.guild.members.me;
                    category = interaction.guild.channels.cache.find(
                        (channel) => {
                            if (channel.type !== ChannelType.GuildCategory)
                                return false;
                            const permissions =
                                channel.permissionsFor(botMember);
                            return (
                                permissions &&
                                permissions.has(
                                    PermissionFlagsBits.ManageChannels
                                )
                            );
                        }
                    );
                }
            }

            if (!category) {
                const follow = await interaction.followUp({
                    content:
                        "❌ Unable to create ticket category. Please contact staff to check bot permissions.",
                    ephemeral: true,
                });
                setTimeout(
                    () => interaction.deleteReply().catch(() => {}),
                    30000
                );
                return;
            }

            const orderId = await createOrder(
                interaction.user.id,
                selectedService,
                null
            );
            const channelName = `${selectedService.replace("_", "-")}-${
                orderId.split("-")[1]
            }`;
            const permissionOverwrites = createTicketChannelPermissions(
                interaction.guild,
                interaction.user
            );

            const botMember = interaction.guild.members.me;
            permissionOverwrites.push({
                id: botMember.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                ],
            });

            const categoryPermissions = category.permissionsFor(botMember);
            if (!categoryPermissions?.has(PermissionFlagsBits.ManageChannels)) {
                const follow = await interaction.followUp({
                    content: `❌ Bot lacks permissions to create channels in the "${category.name}" category.`,
                    ephemeral: true,
                });
                setTimeout(
                    () => interaction.deleteReply().catch(() => {}),
                    30000
                );
                return;
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: permissionOverwrites,
            });

            await require("../database").updateOrder(orderId, {
                channel_id: ticketChannel.id,
            });

            const embed = createTicketEmbed(
                serviceConfig.label,
                orderId,
                interaction.user
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
                    .setEmoji("❌")
            );

            await ticketChannel.send({
                content: `<@${interaction.user.id}>, your ${serviceConfig.label} ticket has been created!`,
                embeds: [embed],
                components: [buttons],
            });

            await interaction.editReply({
                content: `✅ Your ticket has been created: ${ticketChannel}`,
            });
        } catch (error) {
            console.error("Error creating ticket: - orderHandler.js:183", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content:
                        "❌ Failed to create your ticket. Please try again or contact staff.",
                });
            } else {
                const reply = await interaction.reply({
                    content:
                        "❌ Failed to create your ticket. Please try again or contact staff.",
                    ephemeral: true,
                });
                setTimeout(
                    () => interaction.deleteReply().catch(() => {}),
                    30000
                );
            }
        }
    }
}

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

module.exports = {
    handleOrderInteraction,
};
