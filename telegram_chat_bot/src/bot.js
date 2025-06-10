const { Telegraf, Markup } = require('telegraf');
const { userMiddleware } = require('./middlewares/userMiddleware');
const { onboardingMiddleware } = require('./middlewares/onboardingMiddleware');
const {
  startOnboarding,
  handleGenderResponse,
  handleAgeResponse,
  handleLocationResponse,
  handleInterestResponse,
  userOnboardingState, // state map for active onboarding/updates
  ONBOARDING_STAGES,
  resumeOnboarding
} = require('./handlers/onboardingHandler');
const {
    genderKeyboard,
    interestKeyboard,
    mainIdleMenuKeyboard,
    updateProfileKeyboard
} = require('./constants/keyboards');
const { db } = require('./database/database');

// --- Profile Command Imports ---
const {
    myProfileCommand,
    updateGenderCommand,
    updateAgeCommand,
    updateLocationCommand,
    updateInterestCommand,
    backToMainMenuCommand
} = require('./commands/profileCommands');


const BOT_TOKEN = '7947606721:AAGxfrYl1HI86IRkYKbIyhwkmq4cu2Pb-vo';

if (!BOT_TOKEN) {
  console.error('FATAL ERROR: BOT_TOKEN is not defined.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Middlewares
bot.use(userMiddleware);
bot.use(onboardingMiddleware);

// --- Command Handlers ---
bot.start(async (ctx) => {
  if (!ctx.user) {
    return ctx.reply('Welcome! Setting up your profile. Try /start again in a moment.');
  }
  // Clear any existing onboarding/update state when /start is explicitly called
  if (userOnboardingState.has(ctx.user.id)) {
      userOnboardingState.delete(ctx.user.id);
      console.log(`Cleared active state for user ${ctx.user.id} due to /start command.`);
  }

  if (ctx.user.onboarding_complete) {
    await ctx.reply('Welcome back! You are all set up.', mainIdleMenuKeyboard);
  } else {
    // No need to check existingState here anymore, startOnboarding will initiate fresh.
    await startOnboarding(ctx);
  }
});

bot.command('myprofile', async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete onboarding with /start first.");
        return;
    }
    // Clear any pending update state if user directly calls /myprofile
    if (userOnboardingState.has(ctx.user.id) && userOnboardingState.get(ctx.user.id).isUpdate) {
        userOnboardingState.delete(ctx.user.id);
    }
    await myProfileCommand(ctx);
});

// --- Handlers for Update Profile Keyboard Text ---
bot.hears('Update Gender', async (ctx) => {
    if (ctx.user && ctx.user.onboarding_complete) await updateGenderCommand(ctx);
    else await ctx.reply("Please complete onboarding first with /start.");
});
bot.hears('Update Age', async (ctx) => {
    if (ctx.user && ctx.user.onboarding_complete) await updateAgeCommand(ctx);
    else await ctx.reply("Please complete onboarding first with /start.");
});
bot.hears('Update Location', async (ctx) => {
    if (ctx.user && ctx.user.onboarding_complete) await updateLocationCommand(ctx);
    else await ctx.reply("Please complete onboarding first with /start.");
});
bot.hears('Update Interest', async (ctx) => {
    if (ctx.user && ctx.user.onboarding_complete) await updateInterestCommand(ctx);
    else await ctx.reply("Please complete onboarding first with /start.");
});
bot.hears('Back to Main Menu', async (ctx) => {
    if (ctx.user && ctx.user.onboarding_complete) {
        await backToMainMenuCommand(ctx); // This already clears state
    } else {
        await ctx.reply("Let's get you set up first. Type /start to begin.", Markup.removeKeyboard());
    }
});

// --- Onboarding & Update Stage Specific Message Handlers ---
bot.hears(['Male', 'Female'], async (ctx) => {
  const state = userOnboardingState.get(ctx.from.id);
  if (state && state.stage === ONBOARDING_STAGES.ASK_GENDER) {
    await handleGenderResponse(ctx);
  } else if (state && state.stage === ONBOARDING_STAGES.ASK_INTEREST) {
    // If they type "Male" or "Female" when asked for Interest (handled by handleInterestResponse)
    await handleInterestResponse(ctx);
  } else if (ctx.user && ctx.user.onboarding_complete && (!state || !state.isUpdate)) {
    // User is onboarded and NOT in an update session, but typed "Male" or "Female"
    await ctx.reply("What would you like to do?", mainIdleMenuKeyboard);
  }
  // If not in a relevant stage during onboarding/update, or onboarding incomplete, middleware/other handlers should guide.
});

bot.hears(['Both'], async (ctx) => {
  const state = userOnboardingState.get(ctx.from.id);
  if (state && state.stage === ONBOARDING_STAGES.ASK_INTEREST) {
    await handleInterestResponse(ctx);
  } else if (state && state.stage === ONBOARDING_STAGES.ASK_GENDER) {
    await ctx.reply('Invalid gender. Please choose Male or Female.', genderKeyboard);
  } else if (ctx.user && ctx.user.onboarding_complete && (!state || !state.isUpdate)) {
    await ctx.reply("What would you like to do?", mainIdleMenuKeyboard);
  }
});

bot.on('location', async (ctx) => {
  const state = userOnboardingState.get(ctx.from.id);
  if (state && state.stage === ONBOARDING_STAGES.ASK_LOCATION) {
    await handleLocationResponse(ctx);
  } else if (ctx.user && ctx.user.onboarding_complete && (!state || !state.isUpdate)) {
    await ctx.reply("I wasn't expecting a location right now. Use /myprofile to update it.", mainIdleMenuKeyboard);
  }
  // If onboarding incomplete, middleware should handle.
});

// General Text Handler (for Age, and post-onboarding commands from menu)
bot.on('text', async (ctx) => {
  if (!ctx.user) return;

  const state = userOnboardingState.get(ctx.user.id);

  if (state) {
    switch (state.stage) {
      case ONBOARDING_STAGES.ASK_AGE:
        await handleAgeResponse(ctx);
        break;
      case ONBOARDING_STAGES.ASK_GENDER: // Typed text instead of button
         await ctx.reply('Please choose from the Male/Female buttons.', genderKeyboard);
         break;
      case ONBOARDING_STAGES.ASK_INTEREST: // Typed text instead of button
         await ctx.reply('Please choose from the Male/Female/Both buttons.', interestKeyboard);
         break;
      default:
        // console.log(`Text received during unexpected onboarding/update stage: ${state.stage}`);
        // Potentially reply if state.isUpdate vs state (onboarding)
        break;
    }
  } else if (ctx.user.onboarding_complete) {
    if (ctx.user.status === 'idle') {
        if (ctx.message.text === '/new - Find a Chat Partner') {
            await ctx.reply("Looking for a chat partner... (feature coming soon!)", Markup.removeKeyboard());
            // Will be: await require('./commands/newCommand').newCommand(ctx);
        } else if (ctx.message.text === '/myprofile - View & Update Profile') {
            await myProfileCommand(ctx);
        } else if (ctx.message.text.startsWith('/')) {
            // Catch all for unknown commands after onboarding
            await ctx.reply("Unknown command. Try /start or check the menu options.", mainIdleMenuKeyboard);
        } else {
            // Generic text when idle and not a known menu option
            await ctx.reply("What would you like to do?", mainIdleMenuKeyboard);
        }
    } else if (ctx.user.status === 'in_chat') {
        // Placeholder: await require('./handlers/messageHandler').forwardMessage(ctx);
         await ctx.reply("Chat forwarding coming soon!");
    } else if (ctx.user.status === 'waiting') {
        await ctx.reply("Still looking for a partner for you. Please be patient!", Markup.removeKeyboard());
    }
  } else {
    // Onboarding not complete, and not in an active session.
    // onboardingMiddleware should have caught this and started resumeOnboarding.
    // If it reaches here, it's an edge case. Prompt /start.
    await ctx.reply("Please /start the bot to begin setup.", Markup.removeKeyboard());
  }
});

// Global error handler
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType} from user ${ctx.from?.id}:`, err);
  if (err.response && err.description) console.error("Telegram API Error:", err.description);

  if(ctx.from && ctx.from.id && userOnboardingState.has(ctx.from.id)){
    userOnboardingState.delete(ctx.from.id);
    console.log(`Cleared onboarding/update state for user ${ctx.from.id} due to error.`);
  }

  if (ctx.chat && ctx.chat.id) {
    ctx.telegram.sendMessage(ctx.chat.id, 'Oops! Something went wrong. Please try again later. If the problem persists, try /start.')
    .catch(error => console.error('Failed to send error message to user:', error));
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down bot...');
  bot.stop('SIGINT');
  db.close((err) => {
    if (err) console.error('Error closing the database', err.message);
    else console.log('Database connection closed.');
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bot.launch().then(() => {
  console.log('Bot started: Profile updates integrated.');
}).catch(err => {
  console.error('Failed to launch bot:', err);
});

console.log('src/bot.js updated for profile commands and refined text/keyboard handling.');
