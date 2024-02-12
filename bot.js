const tmi = require('tmi.js');

// Define configuration options
const opts = {
    identity: {
        username: 'swooce_bot',
        password: process.env.TWITCH_AUTH_TOKEN
    },
    channels: [
        'swooce19'
    ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

const COMMAND_START_CHAR = "!"
const CUSTOM_TEXT_COMMANDS = {
    "discord": {
        "text": "My Discord can be found here: discord.gg/35dfPZY",
        "enabled": true
    },
    "donate": {
        "text": "If you feel so inclined to donate, the link is here: https://streamlabs.com/swc19 All donations are optional and directly benefit the stream!",
        "enabled": true
    },
    "twitter": {
        "text": "Follow me on Twitter: https://twitter.com/_swooce",
        "enabled": true
    },
    "geoguessr": {
        "text": "My Geoguessr profile is here: https://www.geoguessr.com/user/60d1134800ea7b000152a728",
        "enabled": true
    }
}

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
    const USER_PERMS = () => {
        if(context.username === "swooce19"){
            return 4;
        } else if(context.mod){
            return 3;
        } else if(context.subscriber){
            return 2;
        } else {
            return 1;
        }
    }


    if (self) { return; } // Ignore messages from the bot
    const [first, ...second] = msg.split(" ");
    // ...second is [] of each word after it, even if it's one word
    const command = first.slice(1);
    if(first.startsWith(COMMAND_START_CHAR)){
        if(Object.keys(CUSTOM_TEXT_COMMANDS).includes(command)){
            if(CUSTOM_TEXT_COMMANDS[command].enabled) {
                client.say(target, CUSTOM_TEXT_COMMANDS[command].text);
                console.log(`* Executed ${first} for user ${context.username}`)
                return;
            }
        }
        switch (command) {
            case 'followage':
                const followage = await getFollowage(context);
                client.say(target, followage);
                break;
            case "lurk":
                client.say(target, `Thanks for lurking, ${context.username}! Blobpeek`);
                break;
            case "so":
            case "shoutout":
                if(USER_PERMS() >= 3){
                    if(second[0]){
                        client.say(target, `Check out ${second[0]} at https://twitch.tv/${second[0]}!`);
                    } else {
                        client.say(target, `Please specify a user to shoutout.`);
                    }
                }
                break;
            default:
                break;
                
        }
        console.log(`* Executed ${first} for user ${context.username}`)
    }
}

async function getFollowage(context) {
    const resp = await fetch(`https://commands.garretcharp.com/twitch/followage/swooce19/${context.username}?ping=false`);
    const followageString = await resp.text();
    return followageString;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}
