const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

function createOrderEmbed() {
    return new EmbedBuilder()
        .setTitle('🎮 PotatoBoosting - Order System')
        .setDescription('Welcome to our professional boosting service! Click the button below to create your order.')
        .setColor(0x5865F2)
        .addFields(
            { name: '📋 Available Services', value: config.services.map(s => `${s.emoji} ${s.label}`).join('\n'), inline: false },
            { name: '⚡ Fast Service', value: 'Professional and reliable boosting', inline: true },
            { name: '🔒 Secure', value: 'Your account safety is our priority', inline: true },
            { name: '💬 Support', value: 'Dedicated ticket system', inline: true }
        )
        .setFooter({ text: 'Click "Create Ticket / Order" to get started!' })
        .setTimestamp();
}

function createTicketEmbed(serviceName, orderId, user) {
    return new EmbedBuilder()
        .setTitle(`🎫 ${serviceName} - Ticket`)
        .setDescription(`Order ID: \`${orderId}\`\n\nHello ${user}! Your ticket has been created. Please confirm your order to proceed or close if you've changed your mind.`)
        .setColor(0x57F287)
        .addFields(
            { name: '📝 Next Steps', value: '• Click **Confirm** to fill out your order details\n• Click **Close** to cancel this ticket', inline: false },
            { name: '⏰ Response Time', value: 'Staff will respond within 15 minutes', inline: true },
            { name: '🆔 Order ID', value: `\`${orderId}\``, inline: true }
        )
        .setFooter({ text: 'PotatoBoosting - Professional Service' })
        .setTimestamp();
}

function createOrderDetailsEmbed(order, user) {
    const serviceConfig = config.services.find(s => s.value === order.service_type);
    const embed = new EmbedBuilder()
        .setTitle(`📋 Order Details - ${serviceConfig?.label || order.service_type}`)
        .setColor(0x5865F2)
        .addFields(
            { name: '🆔 Order ID', value: order.order_id, inline: false },
            { name: '👤 Customer', value: `${user.toString()} (${user.username})`, inline: false },
            { name: '🎮 Service', value: serviceConfig?.label || order.service_type, inline: false }
        )
        .setFooter({ text: 'PotatoBoosting - Order Management System' })
        .setTimestamp();

    // Core fields for all services
    if (order.battle_tag) {
        embed.addFields({ name: '⚔️ Battle Tag', value: order.battle_tag, inline: false });
    }
    if (order.pilot_type) {
        embed.addFields({ name: '🕹️ Play Type', value: order.pilot_type, inline: false });
    }
    if (order.express_type) {
        embed.addFields({ name: '⚡ Service Speed', value: order.express_type, inline: false });
    }

    // Service-specific fields
    if (order.service_type === 'powerleveling' || order.service_type === 'paragon_leveling') {
        if (order.from_level) {
            embed.addFields({ name: '📊 From Level', value: order.from_level, inline: true });
        }
        if (order.to_level) {
            embed.addFields({ name: '🎯 To Level', value: order.to_level, inline: true });
        }
    }
    else if (order.service_type === 'boss_kills' && order.kills_amount) {
        embed.addFields({ name: '💀 Kills Needed', value: order.kills_amount, inline: false });
    }
    else if (order.service_type === 'boss_mats' && order.mats_amount) {
        embed.addFields({ name: '💎 Materials Needed', value: order.mats_amount, inline: false });
    }
    else if (order.service_type === 'custom_order' && order.custom_description) {
        embed.addFields({ name: '📝 Custom Requirements', value: order.custom_description, inline: false });
    }
    
    // Add status and creation time
    embed.addFields(
        { name: '📊 Status', value: order.status.toUpperCase(), inline: false },
        { name: '📅 Created', value: `<t:${Math.floor(new Date(order.created_at).getTime() / 1000)}:R>`, inline: false }
    );

    return embed;
}

module.exports = {
    createOrderEmbed,
    createTicketEmbed,
    createOrderDetailsEmbed
};
