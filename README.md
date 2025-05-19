# How to start
1. install dependancies with `npm install`
2. create a discord developer account, create a bot with admin privileges. copy the `.env.example` to `.env` and add your discord bot token (~59 characters long)
3. start bot with `npm start`
4. create a discord roll `Storyteller`. assign to storyteller(s).
5. create a discord roll `Player`. assign to players.

When everyone has joined the voice channel, run command `init` to create the cottages, and you are ready to play!  

# Commands

## General
`.c join` - bot joins current voice channel
`.c leave` - bot leaves voice channel
`.c speak` - debug message, outputs to text channel
## Game Controls
`.c init` - creates the cottages, starts the music, and messages the channel indicating the game is starting 
`.c night` - moves players to their individual cottage channels
`.c day` - brings players back to the main Voice channel

## Music Player
`.c stop` - stops the music player
`.c pause` - pauses the music player
`.c play` - starts the music player

# Dev Notes
## Still need:

1. Traveller Support (drop in/drop out)
2. live updating member changes (like removing/adding storyteller role after booting up)
3. add more music support

## Would be nice

1. randomized rise and sleep messages
2. Custom message formatting
3. create day conversation rooms