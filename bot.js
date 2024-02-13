const tmi = require('tmi.js');
const config = require('config');
const fs = require('fs');
const config_file = 'config/default.json';
let config_contents = JSON.parse(fs.readFileSync(config_file).toString());

// Define configuration options
const opts = {
    identity: {
        username: 'swooce_bot',
        password: config.get('twitch_auth_token')
    },
    channels: [
        'swooce19'
    ]
};


const client = new tmi.client(
    opts);

client.connect().catch((err) => {
    if(err === "Login authentication failed"){
        refreshToken();
    };
});
client.on('connected', onConnectedHandler);
client.on('message', onMessageHandler);


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

// cooldowns in seconds
const COOLDOWNS = {
    "discord": 120,
    "donate": 60,
    "twitter": 120,
    "geoguessr": 120,
    
    "followage": 600,
    "lurk": 120,
}

let last_used = {}

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    const USER_PERMS = () => {
        // set up permission levels for commands that require it.
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

    const [first, ...second] = msg.split(" ");
    // ...second is [] of each word after it, even if it's one word

    const command = first.slice(1);

    if(first.startsWith(COMMAND_START_CHAR)){
        const off_cooldown = () => {
            // check if the given command is on cooldown
            if(COOLDOWNS[command]){
                return (Date.now() - last_used[command])/1000 > COOLDOWNS[command]
            } else {
                return true;
            }
        }
        if(USER_PERMS() >= 3 || !last_used[command] || (last_used[command] && off_cooldown())){
            // currently, mods and streamer can use any command off cooldown
            if(Object.keys(CUSTOM_TEXT_COMMANDS).includes(command)){
                if(CUSTOM_TEXT_COMMANDS[command].enabled) {
                    client.say(target, CUSTOM_TEXT_COMMANDS[command].text);
                    console.log(`* Executed ${first} for user ${context.username}`)
                    last_used[command] = Date.now();
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
            last_used[command] = Date.now();
        }
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

async function refreshToken(){
    const refreshToken = config.get('twitch_refresh_token');
    const resp = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${config.get('twitch_client_id')}&client_secret=${config.get('twitch_client_secret')}`
        });
    const new_tokens = await resp.json();
    config_contents['twitch_auth_token'] = new_tokens['access_token'];
    config_contents['twitch_refresh_token'] = new_tokens['3uqzzy0lzycabuuwpeghdw123hrolnood927ih3obcgxv6c9y4']
    fs.writeFileSync(config_file, JSON.stringify(config_contents));
    throw new Error('Token refreshed, restart the bot.')
}