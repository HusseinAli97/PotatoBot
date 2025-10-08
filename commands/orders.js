// commands/orders.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("orders")
        .setDescription("📋 عرض الأوردرات الجارية والمكتملة"),

    async execute(interaction) {
        // 🎯 السماح فقط للستاف
        const staffRole = interaction.guild.roles.cache.find(
            (r) => r.name === "Staff"
        );
        if (!staffRole || !interaction.member.roles.cache.has(staffRole.id)) {
            return await interaction.reply({
                content: "❌ هذا الأمر مخصص للطاقم فقط.",
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const dbPath = path.join(__dirname, "../data/orders.db");
            const db = new sqlite3.Database(dbPath);

            // 🔍 جلب الأوردرات
            const getOrders = (status) =>
                new Promise((resolve, reject) => {
                    db.all(
                        `SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC`,
                        [status],
                        (err, rows) => (err ? reject(err) : resolve(rows))
                    );
                });

            const pendingOrders = await getOrders("pending");
            const completedOrders = await getOrders("completed");
            db.close();

            // 📦 دمجهم في قائمة واحدة مع تمييز النوع
            const allOrders = [
                ...pendingOrders.map((o) => ({ ...o, category: "🟢 جاري" })),
                ...completedOrders.map((o) => ({ ...o, category: "🟣 مكتمل" })),
            ];

            if (allOrders.length === 0) {
                return await interaction.editReply({
                    content: "📭 لا توجد أي أوردرات حالياً.",
                });
            }

            // 📄 إعداد صفحات العرض
            const pageSize = 10;
            let currentPage = 0;

            const totalPages = Math.ceil(allOrders.length / pageSize);

            const generateEmbed = (page) => {
                const start = page * pageSize;
                const pageOrders = allOrders.slice(start, start + pageSize);

                const embed = new EmbedBuilder()
                    .setTitle("📋 قائمة الأوردرات")
                    .setColor("#00b0f4")
                    .setDescription(
                        pageOrders
                            .map(
                                (o, i) =>
                                    `**${start + i + 1}.** ${o.category} | ${
                                        o.order_id
                                    } — ${o.service_type} — <@${o.user_id}> ${
                                        o.completed_at
                                            ? `📅 ${new Date(
                                                  o.completed_at
                                              ).toLocaleDateString()}`
                                            : ""
                                    }`
                            )
                            .join("\n")
                    )
                    .setFooter({
                        text: `صفحة ${page + 1} من ${totalPages} • إجمالي: ${
                            allOrders.length
                        } أوردر`,
                    })
                    .setTimestamp();

                return embed;
            };

            const buttons = (page) =>
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_page")
                        .setLabel("⏮ السابق")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId("next_page")
                        .setLabel("⏭ التالي")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );

            let message = await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: [buttons(currentPage)],
            });

            const collector = message.createMessageComponentCollector({
                time: 120000, // ⏱️ دقيقتين
            });

            collector.on("collect", async (btnInt) => {
                if (btnInt.user.id !== interaction.user.id) {
                    return btnInt.reply({
                        content: "❌ هذا الأمر ليس لك.",
                        ephemeral: true,
                    });
                }

                if (btnInt.customId === "prev_page" && currentPage > 0) {
                    currentPage--;
                } else if (
                    btnInt.customId === "next_page" &&
                    currentPage < totalPages - 1
                ) {
                    currentPage++;
                }

                await btnInt.update({
                    embeds: [generateEmbed(currentPage)],
                    components: [buttons(currentPage)],
                });
            });

            collector.on("end", async () => {
                if (message.editable) {
                    await message
                        .edit({
                            components: [],
                        })
                        .catch(() => {});
                }
            });
        } catch (error) {
            console.error(
                "❌ Error fetching paginated orders:",
                error
            );
            await interaction.editReply({
                content: "⚠️ حدث خطأ أثناء جلب الأوردرات.",
            });
        }
    },
};
