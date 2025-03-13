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
        "text": "My Discord can be found here: https://discord.gg/35dfPZY",
        "enabled": true
    },
    "donate": {
        "text": "If you feel so inclined to donate, the link is here: https://streamelements.com/swooce19/tip All donations are optional and directly benefit the stream!",
        "enabled": true
    },
    "twitter": {
        "text": "Follow me on Twitter: https://twitter.com/_swooce",
        "enabled": false
    },
	"bluesky": {
		"text": "Follow me on Bluesky: https://bsky.app/profile/swooce.bsky.social",
		"enabled": true
	},
    "geoguessr": {
        "text": "My Geoguessr profile is here: https://www.geoguessr.com/user/60d1134800ea7b000152a728, and you can sign up with my link here and save 40%! https://www.geoguessr.com/referral-program/CO78-SFGL-6R3Q",
        "enabled": true
    },
    "flags": {
        "text": "Here's a list of all the flags that I have: https://docs.google.com/spreadsheets/d/1YjFjc2HcvzzsHm81e5iJXoqErgYdAgafyqTCZkPpqLM/edit?usp=sharing",
        "enabled": false
    },
    "confidence": {
		"text": "I mapped out my confidence in each Geoguessr country: http://tinyurl.com/swooceGeoConfidence",
		"enabled": false
	},
    "gcl": {
		"text": "I'm in Division 3 in the Geoguessr Challenge League for Season 14! https://docs.google.com/spreadsheets/d/1LDuySvElv31l-uq37d7215PG1Ew2C88d4ahx209MvjU/edit?gid=795358607#gid=795358607",
		"enabled": true
	},
	"map": {
		"text": "I made a Geoguessr map of some of the most unique towns in the USA! https://www.geoguessr.com/maps/669680d6170a4d3d9cddc64a",
		"enabled": true
	},
	"playlist": {
		"text": "https://open.spotify.com/playlist/13goTpg7eJ7FdjOtNU4iFs?si=efdb1d3b686a43d1",
		"enabled": true
	},
	"deconstructed": {
		"text": "I have a YouTube series that will eventually cover every country in GeoGuessr! https://www.youtube.com/playlist?list=PLBVB4CuFCGsc85oahk4Ba1D-ZazKFLO3X",
		"enabled": false
	},
	"youtube": {
		"text": "Check out my YouTube channel! https://www.youtube.com/@swooce_",
		"enabled": true
	},
	"newvideo": {
		"text": "My most recent Geoguessr Deconstructed video is on Mexico: https://youtu.be/o_0j1hWfiP0",
		"enabled": false
	},
	"lithuania": {
		"text": "https://www.twitch.tv/gamesdonequick/clip/GracefulSillyCheddarRitzMitz-URT53wAJWfSYor8b",
		"enabled": true
	},
	"gdq": {
		"text": "Check out my AGDQ25 run VODs! https://www.youtube.com/watch?v=-q-dIKUXH90 & https://www.youtube.com/watch?v=0E07MLrrw5A",
		"enabled": true
	},
	"500k": {
		"text": "There's no GCL for March, but I'm doing a 100 seed 5k speedrun, hosted by the same group. More info at https://imgur.com/a/er6udII",
		"enabled": true
	},
    "gim": {
        "text": "I'm in an OSRS competition for the month of April! Rules and info here: https://docs.google.com/document/d/1zRCrJ9eDA5ZIdNGMhmC5kcip-r_av_4RvuwvFLVmK1I/edit?tab=t.0",
        "enabled": false
    }
}
const ALIASES = {
	"deconstruct": "deconstructed",
	"yt": "youtube",
	"agdq": "gdq",
	"bsky": "bluesky"
}

const CHATGUESSR_COMMANDS = ["cg", "cgflags", "best", "me", "clear", "randomplonk"]
// cooldowns in seconds
// cooldowns are currently global for all users, to avoid spam
const COOLDOWNS = {
	// default text cooldown is 30s
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
	const isCommand = (command) => {
        return Object.keys(CUSTOM_TEXT_COMMANDS).includes(command) || Object.keys(ALIASES).includes(command);
    }
    const [first, ...second] = msg.split(" ");
    // ...second is [] of each word after it, even if it's one word

    // returns the command itself in a normalized fashion
    let command = first.slice(1).toLowerCase();

    // ignore any commands that pertain to the chatguessr bot
    // just make sure to not make a custom command that's one of those words
	if(CHATGUESSR_COMMANDS.includes(command)){ return; }

    if(first.startsWith(COMMAND_START_CHAR)){

        const off_cooldown = () => {
			const cooldown_time = 30; // default text command cooldown
            // check if the given command is on cooldown
            if(COOLDOWNS[command]){
				cooldown_time = COOLDOWNS[command];
            } else {
                return true;
            }
			// convert to seconds with the /1000
			return (Date.now() - last_used[command])/1000 > cooldown_time;
        }

        if(USER_PERMS() >= 3 || !last_used[command] || (last_used[command] && off_cooldown())){
            // currently, mods and streamer can use any command off cooldown
            if(isCommand(command)){
                // verify that the command is active and valid
				if(Object.keys(ALIASES).includes(command)){
					command = ALIASES[command];
				}
                if(CUSTOM_TEXT_COMMANDS[command].enabled || !last_used[command] || (last_used[command] && off_cooldown())) {
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