const dotenv = require('dotenv');
dotenv.config();
const Discord = require('discord.js');
const client = new Discord.Client();
const COTTAGE_MAP = new Map();

const ct = '.c';
/** @type {Discord.VoiceChannel} */
let gameChannel;

/** @type {Discord.Message} */
let lastMessage;
/** @type {Discord.Role} */
let storyTellerRole;
/** @type {Discord.Role} */
let playerRole;
client.on('ready', () => console.log('ready.'));

client.on('message', message => {
	if(!message.content.startsWith(ct) || message.author.bot) return;
	console.log(message.content);
	const args = message.content.slice(ct.length + 1).split(/ +/);
	const command = args.shift().toLowerCase();
	console.log(command);

	lastMessage = message;

	switch(command) {
	case 'speak':
		message.channel.send('welcome to Mafia!');
		break;
	case 'join':
		try { message.member.voice.channel.join(); }
		catch (e) {
			console.log(e);
			message.channel.send('you need to be in the voice channel to play.');
		}
		break;
	case 'leave':
		try { message.member.voice.channel.leave(); }
		catch (e) {
			message.channel.send('you need to be in the voice channel to play.');
		}
		break;
	case 'stop':
	case 'pause':
		dispatcher.destroy();
		break;
	case 'play':
		if(dispatcher) dispatcher.resume();
		break;
	case 'init':
		if (!message.member.voice.channel) return message.reply('You must be in a voice channel.');
		try {initGame(message);}
		catch (e) { console.log(e); message.channel.send('I must be in the voice chat to start the game. type **.c join** to invite me!'); }
		break;
	case 'night':
		MoveToNightPhase();
		break;
	case 'day':
		MoveToDay();
		break;
	}

});

let PLAYERS = [];
/**
 * @param {Discord.GuildMember} player - The date
 * @param {string} locationID - The string
 */

function MovePlayer(player, locationID) {
	player.voice.setChannel(locationID);

}

function BuildCottages() {
	const message = lastMessage;
	const category = message.guild.channels.cache.filter(channel => channel.name == 'Cottage Lane' && channel.type == 'category');
	console.log(category.size);
	if(category) DestroyCottages();

	message.guild.channels.create('Cottage Lane', { type: 'category' }).then(cat => AssignPlayers(cat));
}

function DestroyCottages() {
	const message = lastMessage;
	const category = message.guild.channels.cache.filter(channel => channel.name == 'Cottage Lane' && channel.type == 'category');
	category.forEach(e => {
		e.children.forEach(c => c.delete());
		e.delete();
	});
}


/**
 * @param {Discord.Channel} category - The date
 */

function AssignPlayers(category) {
	PLAYERS.forEach(player => {
		const playerID = player.id;
		lastMessage.guild.channels.create('cottage',
			{
				type: 'voice',
				parent: category,
				permissionOverwrites:[
					{
						id: lastMessage.guild.roles.everyone.id,
						deny:['VIEW_CHANNEL'],
					},
					{
						id: playerID,
						allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK'],
					},
					{
						id: storyTellerRole.id,
						allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK'],
					},
				],
			},
		).then(channel => COTTAGE_MAP.set(player, channel.id));
	});
}

let dispatcher;
/** @type {Discord.Collection<string, Discord.GuildMember>} */
let storytellermap;

/** @type {Discord.Collection<string, Discord.GuildMember>} */
let playermap;
/**
 *
 * @param {Discord.Message} message
 * @returns
 */
function initGame(message) {
	/**
	 * Gets all of the members in the current VC, and displays the names.
	 * all members are added to the player list. the bot will then assign a
	 * cottage for only that player.
	 */

	gameChannel = message.guild.voice.channel;
	storyTellerRole = gameChannel.guild.roles.cache.find(role => role.name === 'Storyteller');
	if(!storyTellerRole) return message.channel.send('make sure make a role with name `Storyteller`');

	playerRole = gameChannel.guild.roles.cache.find(role => role.name === 'Player');
	if(!playerRole) return message.channel.send('make sure make a role with name `Player`');

	if(gameChannel.members.filter(a => a.roles.cache.has(storyTellerRole.id)).size === 0) return message.channel.send('make sure someone is assigned the `Storyteller` role.');

	PLAYERS = [];
	if(COTTAGE_MAP)COTTAGE_MAP.clear();
	if(playermap)playermap.clear();
	if(storytellermap)storytellermap.clear();
	// There is a caching issue here. eneds a restart
	playermap = gameChannel.members.filter(a => a.user.id !== client.user.id && !a.roles.cache.has(storyTellerRole.id));
	storytellermap = gameChannel.members.filter(a => a.user.id !== client.user.id && a.roles.cache.has(storyTellerRole.id));
	if(playermap.size == 0) return message.channel.send('Not enough players to play.');

	playermap.forEach(player => {
		player.roles.add(playerRole.id);
		PLAYERS.push(player);
	});

	PlayMusic(gameChannel);

	BuildCottages();
	lastMessage.channel.send('**Welcome to Ravenswood Bluff.** all players have been assigned their cottages.');
	let msg;
	if(storytellermap.size == 1) { msg = 'Your storyteller this evening is: **' + Name(storytellermap.first()) + '**'; }
	else {
		msg = 'Your storytellers this evening are: ';
		const lastTeller = storytellermap.lastKey();
		storytellermap.forEach((member, key) =>{
			if(key === lastTeller) msg += ' and ';
			{ msg += '**' + Name(member) + '**'; }
			if(key !== lastTeller) msg += ', ';
		});
	}


	return 	lastMessage.channel.send(msg);

}

function Name(member) {
	if(member.nickname) return member.nickname;
	else return member.user.username;
}

function PlayMusic(channel) {
	channel.join().then(connection => dispatcher = connection.play('./Music/music.mp3', { volume: 0.5 })).catch(err => console.log(err));
}

function MoveToNightPhase() {
	if(COTTAGE_MAP) COTTAGE_MAP.forEach((cottageID, player) => { MovePlayer(player, cottageID); });
	lastMessage.channel.send('<@&' + playerRole.id + '> **Good Night.**');
	return;
}

function MoveToDay() {
	lastMessage.channel.send('<@&' + playerRole.id + '> **The sun rises upon the town.** Return to Town Square.');

}

/*
function PlayMusic() {

	return;
}

function JoinVC() {

	return;
}

function LeaveVC() {

	return;
}


*/

client.login(process.env.TOKEN);

