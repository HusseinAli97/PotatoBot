const {
    handleOrderInteraction,
} = require("../handlers/orderHandler");
const {
    handleTicketInteraction,
} = require("../handlers/ticketHandler");

module.exports = {
    name: "interactionCreate",
    async execute(interaction) {
        try {
            // =========================
            // SLASH COMMANDS
            // =========================
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(
                    interaction.commandName,
                );

                if (!command) {
                    console.error(
                        `No command matching ${interaction.commandName} was found.`,
                    );
                    return;
                }

                await command.execute(interaction);
                return;
            }

            // =========================
            // BUTTONS
            // =========================
            if (interaction.isButton()) {
                if (interaction.customId === "create_order") {
                    return handleOrderInteraction(interaction);
                }

                if (interaction.customId.startsWith("ticket_")) {
                    return handleTicketInteraction(interaction);
                }

                return;
            }

            // =========================
            // SELECT MENUS
            // =========================
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "service_select") {
                    return handleOrderInteraction(interaction);
                }

                if (
                    interaction.customId.startsWith("payment_method_")
                ) {
                    return handleTicketInteraction(interaction);
                }

                return;
            }

            // =========================
            // MODAL SUBMIT
            // =========================
            if (interaction.isModalSubmit()) {
                if (interaction.customId.startsWith("order_form_")) {
                    return handleTicketInteraction(interaction);
                }

                return;
            }
        } catch (error) {
            console.error("Interaction error:", error);

            // safeguard ضد InteractionAlreadyReplied
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content:
                        "❌ An unexpected error occurred. Please try again.",
                    ephemeral: true,
                });
            }
        }
    },
};
