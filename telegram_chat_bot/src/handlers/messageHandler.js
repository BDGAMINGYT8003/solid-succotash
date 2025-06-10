const userService = require('../services/userService');
const { mainIdleMenuKeyboard } = require('../constants/keyboards');

// --- Content Moderation ---
const BLACKLISTED_KEYWORDS = ['badword1', 'spamlink.co', 'veryoffensive']; // Example blacklist
const WARNING_THRESHOLD_FOR_BAN = 3;
const BAN_DURATION_HOURS = 1; // First ban: 1 hour

// --- Rate Limiting ---
const messageTimestamps = new Map();
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW = 10 * 1000;

// --- Message Length Cap ---
const MAX_MESSAGE_LENGTH = 1024;

const handleChatMessage = async (ctx) => {
    if (!ctx.user || ctx.user.status !== 'in_chat' || !ctx.user.partner_id) {
        console.error('handleChatMessage called for user not in chat or without partner.');
        if (ctx.user) {
            await userService.updateUser(ctx.user.id, { status: 'idle', partner_id: null });
            await ctx.reply("There was an issue with your chat session. You've been returned to the main menu.", mainIdleMenuKeyboard);
        }
        return;
    }

    const userId = ctx.user.id;
    const partnerId = ctx.user.partner_id;
    const messageText = ctx.message.text;

    // 0. Check if sender is banned
    if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) {
        const banEnds = new Date(ctx.user.banned_until).toLocaleString();
        await ctx.reply(`You are currently banned from chatting until ${banEnds}. Your message was not sent.`);
        return;
    }

    // 1. Message Length Cap
    if (messageText.length > MAX_MESSAGE_LENGTH) {
        await ctx.reply(`Your message is too long (max ${MAX_MESSAGE_LENGTH} characters). Please shorten it.`);
        return;
    }

    // 2. Rate Limiting
    const now = Date.now();
    const userTimestamps = messageTimestamps.get(userId) || [];
    const recentTimestamps = userTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (recentTimestamps.length >= RATE_LIMIT_COUNT) {
        await ctx.reply("You're sending messages too quickly. Please wait a moment.");
        messageTimestamps.set(userId, recentTimestamps);
        return;
    }
    recentTimestamps.push(now);
    messageTimestamps.set(userId, recentTimestamps);

    // 3. Content Moderation (Keyword Blacklist)
    const lowerCaseMessage = messageText.toLowerCase();
    const foundBlacklistedWord = BLACKLISTED_KEYWORDS.find(word => lowerCaseMessage.includes(word.toLowerCase()));

    if (foundBlacklistedWord) {
        console.log(`User ${userId} sent message with blacklisted word: '${foundBlacklistedWord}'`);
        await ctx.reply("Your message contains inappropriate content and was not sent. Please be respectful. This is a warning.");

        const currentWarnings = (ctx.user.warnings || 0) + 1;
        ctx.user.warnings = currentWarnings; // Update context
        let updates = { warnings: currentWarnings };

        if (currentWarnings >= WARNING_THRESHOLD_FOR_BAN) {
            const banEndTime = new Date(Date.now() + BAN_DURATION_HOURS * 60 * 60 * 1000);
            updates.banned_until = banEndTime.toISOString();
            updates.warnings = 0; // Reset warnings after ban
            ctx.user.banned_until = updates.banned_until; // Update context
            ctx.user.warnings = 0;
            await ctx.reply(`You have received ${WARNING_THRESHOLD_FOR_BAN} warnings. You are now banned from chatting for ${BAN_DURATION_HOURS} hour(s).`);
            console.log(`User ${userId} banned until ${updates.banned_until} due to ${currentWarnings} warnings.`);
        }
        await userService.updateUser(userId, updates);
        return; // Do not forward the message
    }

    // If all checks pass, proceed to forward
    try {
        const partnerChatId = await userService.getChatIdByUserId(partnerId);
        if (!partnerChatId) {
            console.error(`Could not find chat_id for partner ${partnerId} of user ${userId}.`);
            await userService.updateUser(userId, { status: 'idle', partner_id: null });
            await ctx.reply("Your chat partner seems to be unavailable. The chat has ended.", mainIdleMenuKeyboard);
            // Consider ending session in DB: await matchingService.endChatSession(userId, partnerId);
            return;
        }

        await ctx.telegram.sendChatAction(partnerChatId, 'typing');
        await ctx.telegram.sendMessage(partnerChatId, messageText);
        console.log(`Message from ${userId} forwarded to ${partnerId} (chatId: ${partnerChatId})`);

    } catch (error) {
        console.error(`Error forwarding message from ${userId} to ${partnerId}:`, error);
        if (error.response && (error.response.error_code === 403 || error.response.description.includes('blocked'))) {
            console.log(`Partner ${partnerId} has blocked the bot or chat is deactivated.`);
            await userService.updateUser(userId, { status: 'idle', partner_id: null });
            await ctx.reply("Your chat partner has left or blocked the bot. The chat has ended.", mainIdleMenuKeyboard);
            await userService.updateUser(partnerId, { status: 'idle', partner_id: null });
            // Consider ending session in DB: await matchingService.endChatSession(userId, partnerId);
        } else {
            await ctx.reply("Could not deliver your message due to a temporary issue. Please try again.");
        }
    }
};

module.exports = { handleChatMessage };
console.log('src/handlers/messageHandler.js updated with content moderation and ban logic.');
