const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const { createOrderEmbed } = require("../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Setup the order system in the current channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.channel;

        // Create the order button
        const orderButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("create_order")
                .setLabel("Create Ticket / Order")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🎫")
        );

        const embed = createOrderEmbed();

        try {
            await channel.send({
                embeds: [embed],
                components: [orderButton],
            });

            await interaction.reply({
                content: "✅ Order system has been set up in this channel!",
                ephemeral: true,
            });

            // حذف الرسالة بعد 5 ثوانٍ
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
        } catch (error) {
            console.error("Error setting up order system:", error);
            await interaction.reply({
                content:
                    "❌ Failed to set up the order system. Please check my permissions.",
                ephemeral: true,
            });

            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 5000);
        }
    },
};
