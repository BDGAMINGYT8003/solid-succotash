const userService = require('../services/userService');
const matchingService = require('../services/matchingService');
const { mainIdleMenuKeyboard, inChatMenuKeyboard } = require('../constants/keyboards');
const { Markup } = require('telegraf');

const newCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete your profile first using /start before looking for a chat partner.", Markup.removeKeyboard());
        // Optionally, trigger onboarding:
        // const { startOnboarding } = require('../handlers/onboardingHandler');
        // await startOnboarding(ctx);
        return;
    }

    if (ctx.user.status === 'in_chat') {
        await ctx.reply("You are already in a chat. Use /end to finish your current conversation first.", inChatMenuKeyboard);
        return;
    }

    if (ctx.user.status === 'waiting') {
        await ctx.reply("You are already searching for a partner. Please be patient.", Markup.removeKeyboard());
        return;
    }

    try {
        // Set user status to 'waiting'
        await userService.updateUser(ctx.user.id, { status: 'waiting' });
        ctx.user.status = 'waiting'; // Update context
        await ctx.reply("Searching for a chat partner... Please wait.", Markup.removeKeyboard());
        console.log(`User ${ctx.user.id} (${ctx.user.gender}, interested in ${ctx.user.interested_in}) started waiting.`);

        // Attempt to find a match
        const matchedPair = await matchingService.findMatch(ctx.user);

        if (matchedPair) {
            const currentUser = matchedPair.user1.id === ctx.user.id ? matchedPair.user1 : matchedPair.user2;
            const partnerUser = matchedPair.user1.id === ctx.user.id ? matchedPair.user2 : matchedPair.user1;

            console.log(`Match found for ${currentUser.id} with ${partnerUser.id}`);

            // Notify both users
            // Current user
            await ctx.telegram.sendMessage(currentUser.chat_id,
                `🎉 You've been matched with a ${partnerUser.gender}, aged ${partnerUser.age}. Say hi!`,
                inChatMenuKeyboard
            );
            // Partner user
            // Need to ensure we can send a message to partnerUser.chat_id via bot instance
            await ctx.telegram.sendMessage(partnerUser.chat_id,
                `🎉 You've been matched with a ${currentUser.gender}, aged ${currentUser.age}. Say hi!`,
                inChatMenuKeyboard
            );

            // Create session log - to be implemented in matchingService or here
            await matchingService.createChatSession(currentUser.id, partnerUser.id);

        } else {
            // No immediate match found, user remains in 'waiting' state
            console.log(`No immediate match for ${ctx.user.id}. They remain in queue.`);
            // The earlier "Searching..." message suffices for now.
            // We could add a timeout or periodic check later if desired.
        }

    } catch (error) {
        console.error(`Error in /new command for user ${ctx.user.id}:`, error);
        await ctx.reply("Sorry, something went wrong while trying to find a match. Please try again later.", mainIdleMenuKeyboard);
        // Reset status if something went wrong during matching attempt
        await userService.updateUser(ctx.user.id, { status: 'idle' });
        ctx.user.status = 'idle';
    }
};

module.exports = { newCommand };
console.log('src/commands/newCommand.js created.');
