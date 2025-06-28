const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "orders.db");
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error("Error opening database:", err);
                reject(err);
                return;
            }

            console.log("Connected to SQLite database");

            // Create orders table
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
                (err) => {
                    if (err) {
                        console.error("Error creating orders table:", err);
                        reject(err);
                    } else {
                        console.log("Orders table ready");
                        addColumnIfNotExists("hours_amount", "TEXT");

                        resolve();
                    }
                }
            );
        });
    });
}
// Check if column exists, add it if not
function addColumnIfNotExists(column, type) {
    db.all(`PRAGMA table_info(orders);`, (err, rows) => {
        if (err) {
            console.error("Error reading table info:", err);
            return;
        }

        const exists = rows.some((row) => row.name === column);
        if (!exists) {
            db.run(
                `ALTER TABLE orders ADD COLUMN ${column} ${type};`,
                (err) => {
                    if (err) {
                        console.error(`Error adding column ${column}:`, err);
                    } else {
                        console.log(`Column "${column}" added successfully.`);
                    }
                }
            );
        }
    });
}

function generateOrderId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `ORD-${timestamp}-${random}`.toUpperCase();
}

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
                    resolve(orderId);
                }
            }
        );
    });
}

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
                    resolve(this.changes);
                }
            }
        );
    });
}

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

function deleteOrder(orderId) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM orders WHERE order_id = ?`,
            [orderId],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            }
        );
    });
}

module.exports = {
    initDatabase,
    createOrder,
    updateOrder,
    getOrder,
    deleteOrder,
    generateOrderId,
};
