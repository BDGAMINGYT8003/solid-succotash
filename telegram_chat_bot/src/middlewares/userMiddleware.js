const { findOrCreateUser } = require('../services/userService');

const userMiddleware = async (ctx, next) => {
  if (ctx.from) { // Ensure 'from' exists, typical for messages, callbacks
    const userId = ctx.from.id;
    const chatId = ctx.chat?.id; // chat.id is needed for sending messages back

    if (!chatId) {
      // This might happen for some update types like inline_query if not handled specifically
      // console.warn('userMiddleware: Could not determine chat_id from context.');
      // For direct user interactions, chat_id should usually be ctx.from.id or ctx.chat.id
      // If it's a channel post or something not directly from a user in a private/group chat,
      // ctx.from might be present but ctx.chat.id might be the channel's.
      // We need a clear chat_id to interact back. For this bot, interaction is 1-on-1.
      // So, if ctx.chat.id is not available, we might not be able to proceed with this user.
      // However, for most direct messages and callback queries, ctx.chat.id will be available.
      // For now, we assume private chats where ctx.chat.id is the relevant one.
      if (ctx.message || ctx.callbackQuery) {
         // console.log('User middleware: using ctx.from.id as chat_id as ctx.chat.id is not available');
         // It's generally better to use ctx.chat.id for sending messages.
         // If ctx.chat is undefined, it means the update isn't tied to a specific chat e.g. inline query
         // For this bot, we mostly care about direct messages and callbacks in private chats
         // where ctx.chat.id should be present and equal to ctx.from.id
      }
    }

    // Ensure we have a valid chat_id to store; for private chats, this is typically same as user_id
    // For group chats, ctx.chat.id is the group's ID, ctx.from.id is the user's ID.
    // Bot interaction is 1-on-1, so we expect private chats.
    const effectiveChatId = ctx.chat && ctx.chat.type === 'private' ? ctx.chat.id : (ctx.callbackQuery ? ctx.message.chat.id : null);

    if (!effectiveChatId) {
        // console.warn(`userMiddleware: Could not determine a valid effectiveChatId for user ${userId}. Update type: ${ctx.updateType}`);
        // Let it pass through, other parts of the bot might handle updates not requiring a user session
        // or will fail gracefully if ctx.user is needed but not present.
        // For this bot, most actions will require ctx.user.
        return next();
    }

    try {
      const user = await findOrCreateUser(userId, effectiveChatId);
      ctx.user = user; // Attach user to context
      // console.log(`User ${userId} (chat: ${effectiveChatId}) processed by userMiddleware. Onboarding: ${user.onboarding_complete}`);
    } catch (error) {
      console.error(`Error in userMiddleware for user ${userId}:`, error);
      // Optionally, inform the user about the error
      // ctx.reply('Sorry, something went wrong while processing your information. Please try again later.');
      // Do not proceed if user context cannot be established for critical operations
      return; // Or handle error more gracefully
    }
  } else {
    // console.warn('userMiddleware: ctx.from is undefined. Update type:', ctx.updateType, JSON.stringify(ctx.update, null, 2));
  }
  return next(); // Proceed to the next middleware or handler
};

module.exports = { userMiddleware };

console.log('src/middlewares/userMiddleware.js created successfully.');
