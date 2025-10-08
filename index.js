require("./server.js");
require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { initDatabase } = require("./database");
const config = require("./config.json");

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

// Load events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

client.once("ready", async () => {
    console.log(`${client.user.tag} is online! - index.js:51`);

    // Initialize database
    await initDatabase();

    // Register slash commands
    const commands = [];
    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    try {
        console.log(
            "Started refreshing application (/) commands."
        );
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands,
        });
        console.log(
            "Successfully reloaded application (/) commands."
        );
    } catch (error) {
        console.error(error);
    }
});

client.login(process.env.TOKEN);
