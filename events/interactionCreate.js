const { handleOrderInteraction } = require('../handlers/orderHandler');
const { handleTicketInteraction } = require('../handlers/ticketHandler');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Error executing command:', error);
                const reply = {
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }
        // Handle button interactions
        else if (interaction.isButton()) {
            if (interaction.customId === 'create_order') {
                await handleOrderInteraction(interaction);
            } else if (interaction.customId.startsWith('ticket_')) {
                await handleTicketInteraction(interaction);
            }
        }
        // Handle select menu interactions
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'service_select') {
                await handleOrderInteraction(interaction);
            } else if (interaction.customId.startsWith('payment_method_')) {
                await handleTicketInteraction(interaction);
            }
        }
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('order_form_')) {
                await handleTicketInteraction(interaction);
            }
        }
    }
};
