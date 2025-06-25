const config = require('../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            // Find the VsC role
            const vscRole = member.guild.roles.cache.find(role => role.name === config.roleNames.vsc);
            
            if (!vscRole) {
                console.error(`Role "${config.roleNames.vsc}" not found in guild ${member.guild.name}`);
                return;
            }

            // Add the VsC role to the new member
            await member.roles.add(vscRole);
            console.log(`Assigned ${config.roleNames.vsc} role to ${member.user.tag}`);
            
        } catch (error) {
            console.error('Error adding role to new member:', error);
        }
    }
};
