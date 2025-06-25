const { PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

function createTicketChannelPermissions(guild, user) {
    const staffRole = guild.roles.cache.find(role => role.name === config.roleNames.staff);
    
    const permissions = [
        {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }
    ];

    if (staffRole) {
        permissions.push({
            id: staffRole.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageChannels
            ]
        });
    }

    return permissions;
}

module.exports = {
    createTicketChannelPermissions
};
