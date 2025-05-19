const dotenv = require('dotenv');
dotenv.config();
const Discord = require('discord.js');
const client = new Discord.Client();
const COTTAGE_MAP = new Map();

const fs = require('fs');
const path = require('path');
const QUEUE = [];

const ct = '.c';
/** @type {Discord.VoiceChannel} */
let gameChannel;

/** @type {Discord.Message} */
let lastMessage;
/** @type {Discord.Role} */
let storyTellerRole;
/** @type {Discord.Role} */
let playerRole;
LoadMusic();

let dayCount = 1;

client.on('ready', () => {
	console.log('ready.');

});


client.on('message', message => {
	if(!message.content.startsWith(ct) || message.author.bot) return;
	console.log(message.content);
	const args = message.content.slice(ct.length + 1).split(/ +/);
	const command = args.shift().toLowerCase();
	console.log(command);

	lastMessage = message;

	switch(command) {
	case 'speak':
		message.channel.send('Welcome, to **Ravenswood Bluff**.');
		return;
	case 'join':
		storyTellerRole = GetRole('Storyteller');
		playerRole = GetRole('Player');

		try { message.member.voice.channel.join();}
		catch (e) {
			console.log(e);
			message.channel.send('you need to be in the voice channel to play.');
		}
		return;
	case 'leave':
		try { message.member.voice.channel.leave(); }
		catch (e) {
			message.channel.send('you need to be in the voice channel to play.');
		}
		return;
	case 'play':
		gameChannel = message.channel;
		PlayMusic(message.guild.voice.channel);
		return;
	}


	if(!message.member.roles.cache.has(storyTellerRole.id)) return;

	switch(command) {
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
/** @type {Discord.StreamDispatcher} */
let dispatcher;
/** @type {Discord.Collection<string, Discord.GuildMember>} */
let storytellermap;

/** @type {Discord.Collection<string, Discord.GuildMember>} */
let playermap;
/**
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
	FetchRoles(message);
	Reset();
	MapPlayers();

	if(playermap.size == 0) return message.channel.send('Not enough players to play.');
	if(storytellermap.size == 0) return message.channel.send('make sure someone is assigned the `Storyteller` role.');

	playermap.forEach(player => {
		player.roles.add(playerRole.id);
		PLAYERS.push(player);
	});


	// this was commented out, not sure why
	BuildCottages();

	// disable the below to block music playing on start 
	PlayMusic(gameChannel);
	return OpenMessage();


}

function FetchRoles(message) {
	storyTellerRole = GetRole('Storyteller');
	if(!storyTellerRole) return message.channel.send('make sure to make a role with name `Storyteller`');

	playerRole = GetRole('Player');
	if(!playerRole) return message.channel.send('make sure to make a role with name `Player`');

}

// There is a caching issue here. eneds a restart
function MapPlayers() {
	const members = gameChannel.members.filter(a => a.user.id !== client.user.id);
	storytellermap = members.filter(a => a.roles.cache.has(storyTellerRole.id));
	playermap = members.filter((a, key) => !storytellermap.has(key));

	console.log(playermap);

	playermap.forEach(player => {
		player.roles.add(playerRole.id);
	});

	return [storytellermap, playermap];
}

function GetRole(roleName) {
	return lastMessage.guild.roles.cache.find(role => role.name === roleName);
}

function Reset() {
	PLAYERS = [];
	dayCount = 1;
	if(COTTAGE_MAP)		COTTAGE_MAP.clear();
	if(playermap)		playermap.clear();
	if(storytellermap)	storytellermap.clear();
}

function OpenMessage() {
	lastMessage.channel.send('**Welcome to Ravenswood Bluff.** All **' + playermap.size + '** players have been assigned the Player role and their cottages.');

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

/** @param {Discord.VoiceChannel} channel*/
function PlayMusic(channel) {
	channel.join().then(connection => {
		console.log(QUEUE.pop());
		dispatcher = connection.play('./Music/' + QUEUE.pop(), { volume: 0.5 });
	}).catch(err => console.log(err));

}


function MoveToNightPhase() {
	if(COTTAGE_MAP) COTTAGE_MAP.forEach((cottageID, player) => { MovePlayer(player, cottageID); });
	lastMessage.channel.send('<@&' + playerRole.id + '> **Good Night.** Night **' + dayCount + '** commences.');
	return;
}

async function MoveToDay() {
	const message = lastMessage.channel.send('<@&' + playerRole.id + '> **The sun rises upon the town.** Everyone will be returned to the Town square in **3**.');
	await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec
	(await message).edit('<@&' + playerRole.id + '> **The sun rises upon the town.** Everyone will be returned to the Town square in **2**.');
	await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec
	(await message).edit('<@&' + playerRole.id + '> **The sun rises upon the town.** Everyone will be returned to the Town square in **1**.');
	await new Promise(resolve => setTimeout(resolve, 1000)); // 1 sec
	if(COTTAGE_MAP) COTTAGE_MAP.forEach((cottageID, player) => {
		MovePlayer(player, gameChannel.id);
	});
	(await message).edit('<@&' + playerRole.id + '> **The sun rises upon the town. Good Morning** Welcome to day **' + dayCount + '**.');
	dayCount++;

}

function LoadMusic() {
	const directoryPath = path.join(__dirname, 'Music');
	fs.readdir(directoryPath, (err, files) => {
		if(err) return console.log(err);
		files.forEach((file) => QUEUE.push(file));
		QUEUE.pop();
	});

}
client.login(process.env.TOKEN);

