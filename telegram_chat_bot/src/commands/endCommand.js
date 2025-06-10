const userService = require('../services/userService');
const matchingService = require('../services/matchingService'); // For ending session
const { mainIdleMenuKeyboard, inChatMenuKeyboard } = require('../constants/keyboards');

const endCommand = async (ctx) => {
    if (!ctx.user || ctx.user.status !== 'in_chat' || !ctx.user.partner_id) {
        await ctx.reply("You are not currently in a chat.", mainIdleMenuKeyboard);
        // Ensure status is idle if somehow inconsistent
        if (ctx.user && ctx.user.status !== 'idle') {
            await userService.updateUser(ctx.user.id, { status: 'idle', partner_id: null });
            ctx.user.status = 'idle';
            ctx.user.partner_id = null;
        }
        return;
    }

    const userId = ctx.user.id;
    const partnerId = ctx.user.partner_id;

    try {
        console.log(`User ${userId} initiated /end with partner ${partnerId}.`);

        // Update statuses for both users
        await userService.updateUser(userId, { status: 'idle', partner_id: null });
        await userService.updateUser(partnerId, { status: 'idle', partner_id: null });

        // Update context for current user
        ctx.user.status = 'idle';
        ctx.user.partner_id = null;

        // Log session end time
        await matchingService.endChatSession(userId, partnerId);

        // Notify both users
        await ctx.reply("You have ended the chat.", mainIdleMenuKeyboard);

        const partnerChatId = await userService.getChatIdByUserId(partnerId);
        if (partnerChatId) {
            // Use bot.telegram.sendMessage to send message to partner without their context
            await ctx.telegram.sendMessage(partnerChatId, "The other user has ended the chat.", mainIdleMenuKeyboard)
                .catch(err => console.error(`Error sending /end notification to partner ${partnerId}:`, err));
        } else {
            console.log(`Could not retrieve chat_id for partner ${partnerId} to send /end notification.`);
        }

        console.log(`Chat ended between ${userId} and ${partnerId}. Both set to idle.`);

    } catch (error) {
        console.error(`Error in /end command for user ${userId}:`, error);
        // Attempt to reply to current user even if other parts failed
        await ctx.reply("An error occurred while trying to end the chat. Please try again.", inChatMenuKeyboard)
            .catch(err => console.error("Failed to send error reply in /end:", err));
        // Potentially leave users in a stuck state if DB updates failed partially.
        // Global error handler in bot.js might also catch this and try to reset.
    }
};

module.exports = { endCommand };
console.log('src/commands/endCommand.js created.');
