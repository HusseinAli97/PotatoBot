// commands/orders.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCompletedOrders } = require("../database");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("orders")
        .setDescription("عرض قائمة الأوردرات المكتملة"),

    async execute(interaction) {
        // فقط السماح لستاف بالدخول
        const staffRole = interaction.guild.roles.cache.find(
            (r) => r.name === "Staff"
        );
        if (!interaction.member.roles.cache.has(staffRole.id)) {
            return await interaction.reply({
                content: "❌ هذا الأمر مخصص للطاقم فقط.",
                ephemeral: true,
            });
        }

        const orders = await getCompletedOrders();

        if (!orders.length) {
            return await interaction.reply({
                content: "📭 لا توجد أوردرات مكتملة حالياً.",
                ephemeral: true,
            });
        }

        // إرسال كأمبد
        const embed = new EmbedBuilder()
            .setTitle("📦 الأوردرات المكتملة")
            .setColor("Green")
            .setDescription(
                orders
                    .slice(0, 10)
                    .map(
                        (o, i) =>
                            `**${i + 1}.** ${o.order_id} - ${o.service_type} - <@${o.user_id}> - ${new Date(o.completed_at).toLocaleDateString()}`
                    )
                    .join("\n")
            )
            .setFooter({ text: `إجمالي: ${orders.length} أوردر` });

        await interaction.reply({
            embeds: [embed],
            ephemeral: true,
        });
    },
};
