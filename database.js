const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// 🧱 إنشاء مجلد دائم لتخزين قاعدة البيانات ونسخها الاحتياطية
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 🗃️ المسار الثابت للقاعدة
const dbPath = path.join(dataDir, "orders.db");
let db;

// 🚀 تهيئة قاعدة البيانات
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, async (err) => {
            if (err) {
                console.error(
                    "❌ Error opening database:",
                    err
                );
                reject(err);
                return;
            }

            console.log(
                `✅ Connected to SQLite database at: ${dbPath}`
            );

            // 🧾 إنشاء جدول الأوردرات إذا لم يكن موجودًا
            db.run(
                `CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id TEXT UNIQUE,
                    user_id TEXT NOT NULL,
                    service_type TEXT NOT NULL,
                    channel_id TEXT,
                    battle_tag TEXT,
                    pilot_type TEXT,
                    express_type TEXT,
                    from_level TEXT,
                    to_level TEXT,
                    kills_amount TEXT,
                    mats_amount TEXT,
                    custom_description TEXT,
                    hours_amount TEXT,
                    payment_method TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    completed_at DATETIME
                )`,
                async (err) => {
                    if (err) {
                        console.error(
                            "❌ Error creating orders table:",
                            err
                        );
                        reject(err);
                    } else {
                        console.log("🗂️ Orders table ready - database.js:62");

                        await addColumnIfNotExists("hours_amount", "TEXT");

                        // 🧩 عمل نسخة احتياطية فقط لو الملف موجود مسبقًا
                        if (fs.existsSync(dbPath)) {
                            await backupDatabase();
                        }

                        resolve();
                    }
                }
            );
        });
    });
}

// ✅ التحقق من الأعمدة وإضافتها إن لم تكن موجودة
function addColumnIfNotExists(column, type) {
    return new Promise((resolve) => {
        db.all(`PRAGMA table_info(orders);`, (err, rows) => {
            if (err) {
                console.error(
                    "❌ Error reading table info:",
                    err
                );
                return resolve();
            }

            const exists = rows.some((row) => row.name === column);
            if (!exists) {
                db.run(
                    `ALTER TABLE orders ADD COLUMN ${column} ${type};`,
                    (err) => {
                        if (err) {
                            console.error(
                                `❌ Error adding column ${column}:`,
                                err
                            );
                        } else {
                            console.log(
                                `🆕 Column "${column}" added successfully.`
                            );
                        }
                        resolve();
                    }
                );
            } else {
                resolve();
            }
        });
    });
}

// 🧩 توليد معرف أوردر فريد
function generateOrderId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD-${timestamp}-${random}`.toUpperCase();
}

// 🧾 إنشاء أوردر جديد
function createOrder(userId, serviceType, channelId) {
    return new Promise((resolve, reject) => {
        const orderId = generateOrderId();

        db.run(
            `INSERT INTO orders (order_id, user_id, service_type, channel_id) VALUES (?, ?, ?, ?)`,
            [orderId, userId, serviceType, channelId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(
                        `🟢 Created new order: ${orderId}`
                    );
                    resolve(orderId);
                }
            }
        );
    });
}

// 🔄 تحديث أوردر
function updateOrder(orderId, data) {
    return new Promise((resolve, reject) => {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }

        values.push(orderId);

        db.run(
            `UPDATE orders SET ${fields.join(", ")} WHERE order_id = ?`,
            values,
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(
                        `🟠 Updated order: ${orderId}`
                    );
                    resolve(this.changes);
                }
            }
        );
    });
}

// 🔍 استرجاع أوردر
function getOrder(orderId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM orders WHERE order_id = ?`,
            [orderId],
            (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        );
    });
}

// ❌ حذف أوردر
function deleteOrder(orderId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM orders WHERE order_id = ?`,
            [orderId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(
                        `🔴 Deleted order: ${orderId}`
                    );
                    resolve(this.changes);
                }
            }
        );
    });
}

// 🧾 استرجاع الأوردرات المكتملة
function getCompletedOrders() {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM orders WHERE status = 'completed' ORDER BY completed_at DESC`,
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(
                        `📦 Found ${rows.length} completed orders.`
                    );
                    resolve(rows);
                }
            }
        );
    });
}

// 💾 نسخ احتياطي آمن للقاعدة
async function backupDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            console.log("⚠️ No database found to back up. - database.js:235");
            return;
        }

        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, "-")
            .replace("T", "_")
            .split("Z")[0];
        const backupPath = path.join(dataDir, `orders_backup_${timestamp}.db`);

        await fs.promises.copyFile(dbPath, backupPath);
        console.log(`🧩 Backup created: ${backupPath} - database.js:247`);
    } catch (error) {
        console.error(
            "⚠️ Failed to create database backup:",
            error
        );
    }
}

// 🧩 تصدير الدوال
module.exports = {
    initDatabase,
    createOrder,
    updateOrder,
    getOrder,
    deleteOrder,
    generateOrderId,
    getCompletedOrders,
    backupDatabase,
};
