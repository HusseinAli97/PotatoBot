const { ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createOrder } = require('../database');
const { createTicketChannelPermissions } = require('../utils/permissions');
const { createTicketEmbed } = require('../utils/embeds');
const config = require('../config.json');

async function handleOrderInteraction(interaction) {
    if (interaction.isButton() && interaction.customId === 'create_order') {
        // Show private select menu
        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('service_select')
                    .setPlaceholder('Select a service type...')
                    .addOptions(config.services.map(service => ({
                        label: service.label,
                        value: service.value,
                        emoji: service.emoji
                    })))
            );

        await interaction.reply({
            content: 'Please select the type of service you need:',
            components: [selectMenu],
            ephemeral: true
        });
    }
    else if (interaction.isStringSelectMenu() && interaction.customId === 'service_select') {
        const selectedService = interaction.values[0];
        const serviceConfig = config.services.find(s => s.value === selectedService);
        
        if (!serviceConfig) {
            await interaction.reply({
                content: '❌ Invalid service selection.',
                ephemeral: true
            });
            return;
        }

        try {
            // Reply to interaction first to prevent timeout
            await interaction.reply({
                content: '🎫 Creating your ticket, please wait...',
                flags: 64 // MessageFlags.Ephemeral
            });

            // Find or create category with permission checks
            const categoryName = getCategoryName(selectedService);
            let category = interaction.guild.channels.cache.find(
                c => c.type === ChannelType.GuildCategory && c.name === categoryName
            );

            // If category doesn't exist, try to create it
            if (!category) {
                console.log(`Category "${categoryName}" not found, attempting to create...`);
                try {
                    category = await interaction.guild.channels.create({
                        name: categoryName,
                        type: ChannelType.GuildCategory
                    });
                    console.log(`Successfully created category: ${categoryName}`);
                } catch (error) {
                    console.error(`Failed to create category "${categoryName}":`, error);
                    
                    // Fallback: find any category where bot has permissions
                    console.log('Looking for fallback category...');
                    const botMember = interaction.guild.members.me;
                    category = interaction.guild.channels.cache.find(channel => {
                        if (channel.type !== ChannelType.GuildCategory) return false;
                        const permissions = channel.permissionsFor(botMember);
                        return permissions && permissions.has(PermissionFlagsBits.ManageChannels);
                    });
                    
                    if (category) {
                        console.log(`Using fallback category: ${category.name}`);
                    }
                }
            }

            if (!category) {
                console.error('No suitable category found and unable to create one');
                await interaction.followUp({
                    content: '❌ Unable to create ticket category. Please contact staff to check bot permissions.',
                    ephemeral: true
                });
                return;
            }

            // Generate order ID and create database entry
            const orderId = await createOrder(interaction.user.id, selectedService, null);
            
            // Create ticket channel with proper permissions
            const channelName = `${selectedService.replace('_', '-')}-${orderId.split('-')[1]}`;
            const permissionOverwrites = createTicketChannelPermissions(interaction.guild, interaction.user);
            
            // Add bot permissions explicitly
            const botMember = interaction.guild.members.me;
            permissionOverwrites.push({
                id: botMember.id,
                allow: [
                    require('discord.js').PermissionFlagsBits.ViewChannel,
                    require('discord.js').PermissionFlagsBits.SendMessages,
                    require('discord.js').PermissionFlagsBits.ReadMessageHistory,
                    require('discord.js').PermissionFlagsBits.EmbedLinks,
                    require('discord.js').PermissionFlagsBits.AttachFiles
                ]
            });

            // Check if bot has permission to create channels in this category
            const categoryPermissions = category.permissionsFor(botMember);
            
            if (!categoryPermissions.has('ManageChannels')) {
                console.error(`Bot missing ManageChannels permission in category: ${category.name}`);
                await interaction.followUp({
                    content: `❌ Bot lacks permissions to create channels in the "${category.name}" category. Please give the bot "Manage Channels" permission for this category.`,
                    ephemeral: true
                });
                return;
            }
            
            if (!categoryPermissions || !categoryPermissions.has(PermissionFlagsBits.ManageChannels)) {
                console.error(`Bot lacks ManageChannels permission in category: ${category.name}`);
                console.log('Bot permissions in category:', categoryPermissions?.toArray() || 'None');
                await interaction.followUp({
                    content: `❌ Missing permissions in "${category.name}". Please ensure the bot has "Manage Channels" permission in this category.`,
                    ephemeral: true
                });
                return;
            }
            
            console.log(`Creating channel "${channelName}" in category "${category.name}"`);

            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: permissionOverwrites
            });

            // Update order with channel ID
            await require('../database').updateOrder(orderId, { channel_id: ticketChannel.id });

            // Send ticket embed with buttons
            const embed = createTicketEmbed(serviceConfig.label, orderId, interaction.user);
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_confirm_${orderId}`)
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${orderId}`)
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            await ticketChannel.send({
                content: `<@${interaction.user.id}>, your ${serviceConfig.label} ticket has been created!`,
                embeds: [embed],
                components: [buttons]
            });

            await interaction.editReply({
                content: `✅ Your ticket has been created: ${ticketChannel}`
            });

        } catch (error) {
            console.error('Error creating ticket:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Failed to create your ticket. Please try again or contact staff.'
                });
            } else {
                await interaction.reply({
                    content: '❌ Failed to create your ticket. Please try again or contact staff.',
                    flags: 64 // MessageFlags.Ephemeral
                });
            }
        }
    }
}

function getCategoryName(serviceValue) {
    const categoryMap = {
        'paragon_leveling': config.categories.paragonLeveling,
        'powerleveling': config.categories.powerleveling,
        'gearing': config.categories.gearing,
        'boss_kills': config.categories.bossKills,
        'boss_mats': config.categories.bossMats,
        'custom_order': config.categories.customOrder
    };
    
    return categoryMap[serviceValue] || config.categories.customOrder;
}

module.exports = {
    handleOrderInteraction
};
