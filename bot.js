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
    // simple commands that exclusively return a string, does not take in any context or api
    "discord": {
        "text": "My Discord can be found here: discord.gg/35dfPZY",
        "enabled": true
    },
    "donate": {
        "text": "If you feel so inclined to donate, the link is here: https://streamelements.com/swooce19/tip All donations are optional and directly benefit the stream!",
        "enabled": true
    },
    "twitter": {
        "text": "Follow me on Twitter: https://twitter.com/_swooce",
        "enabled": true
    },
    "geoguessr": {
        "text": "My Geoguessr profile is here: https://www.geoguessr.com/user/60d1134800ea7b000152a728, and you can sign up with my link here and save 40%! https://www.geoguessr.com/referral-program/CO78-SFGL-6R3Q",
        "enabled": true
    },
    "flags": {
        "text": "My progress on contacting every state, province and country for a flag/license plate is here: http://tinyurl.com/swooceFlagProject",
        "enabled": false
    },
    "confidence": {
		"text": "I mapped out my confidence in each Geoguessr country: http://tinyurl.com/swooceGeoConfidence",
		"enabled": false
	},
    "gcl": {
		"text": "I'm in Division 7 in the Geoguessr Challenge League for Season 5! https://docs.google.com/spreadsheets/d/1LDuySvElv31l-uq37d7215PG1Ew2C88d4ahx209MvjU/edit?usp=sharing",
		"enabled": true
	}
}

const CHATGUESSR_COMMANDS = ["cg", "cgflags", "best", "me", "clear", "randomplonk"]
// cooldowns in seconds
// cooldowns are currently global for all users, to avoid spam
const COOLDOWNS = {
    // text commands
    "discord": 30,
    "donate": 30,
    "twitter": 30,
    "geoguessr": 30,
    "lurk": 30,
    "flags": 30,
    "gcl": 30,
    
    // api/function based commands
    "followage": 300,
    
}

// list of the last timestamp a function was used
// resets every time the bot does
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

    // returns the command itself in a normalized fashion
    const command = first.slice(1).toLowerCase();

    // ignore any commands that pertain to the chatguessr bot
    // just make sure to not make a custom command that's one of those words
	if(CHATGUESSR_COMMANDS.includes(command)){ return; }

    if(first.startsWith(COMMAND_START_CHAR)){
        const off_cooldown = () => {
            // check if the given command is on cooldown
            if(COOLDOWNS[command]){
                // convert to seconds with the /1000
                return (Date.now() - last_used[command])/1000 > COOLDOWNS[command]
            } else {
                return true;
            }
        }
        if(USER_PERMS() >= 3 || !last_used[command] || (last_used[command] && off_cooldown())){
            // currently, mods and streamer can use any command off cooldown
            if(Object.keys(CUSTOM_TEXT_COMMANDS).includes(command)){
                // verify that the command is active and valid
                if(CUSTOM_TEXT_COMMANDS[command].enabled) {
                    client.say(target, CUSTOM_TEXT_COMMANDS[command].text);
                    console.log(`* Executed ${first} for user ${context.username}`)
                    // add the command and the current timestamp to the list
                    last_used[command] = Date.now();
                    return;
                }
            }
            switch (command) {
                // if the command isn't a text command, go through the motions to do the right thing for it
                case 'followage':
                    const followage = await getFollowage(context);
                    client.say(target, followage);
                    break;
                case "lurk":
                    client.say(target, `Thanks for lurking, ${context.username}! Blobpeek`);
                    break;
                // so can be an alias for shoutout, so just accept both
                case "so":
                case "shoutout":
                    // only mods and streamer can shoutout
                    if(USER_PERMS() >= 3){
                        if(second[0]){
                            // this can technically be used for any string, not a lot of validation here (not a big deal)
							let user = second[0];
							if(user.startsWith("@")){user = user.slice(1);}
                            client.say(target, `Check out ${user} at https://twitch.tv/${user}!`);
                        } else {
                            // soft error if there's no user
                            client.say(target, `Please specify a user to shoutout.`);
                        }
                    }
                    break;
                default:
                    break;
                    
            }
            // just log it for my viewing later i guess
            console.log(`* Executed ${first} for user ${context.username}`)
            // store the timestamp
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
    // refresh the api token on twitch's end
    // the api token resets every day or so, so this is basically needed every run
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
    config_contents['twitch_refresh_token'] = new_tokens['refresh_token']
    fs.writeFileSync(config_file, JSON.stringify(config_contents));
    throw new Error('Token refreshed, restart the bot.')
}