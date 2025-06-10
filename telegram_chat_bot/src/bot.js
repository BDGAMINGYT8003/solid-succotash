const { Telegraf, Markup } = require('telegraf');
const userService = require('./services/userService');
const { userMiddleware } = require('./middlewares/userMiddleware');
const { onboardingMiddleware } = require('./middlewares/onboardingMiddleware');
const {
  startOnboarding,
  handleGenderResponse,
  handleAgeResponse,
  handleLocationResponse,
  handleInterestResponse,
  userOnboardingState,
  ONBOARDING_STAGES,
  resumeOnboarding
} = require('./handlers/onboardingHandler');
const { handleChatMessage } = require('./handlers/messageHandler');
const {
    genderKeyboard,
    interestKeyboard,
    mainIdleMenuKeyboard,
    inChatMenuKeyboard,
    updateProfileKeyboard
} = require('./constants/keyboards');
const { db } = require('./database/database'); // db needed for startup cleanup

// Command imports
const {
    myProfileCommand,
    updateGenderCommand,
    updateAgeCommand,
    updateLocationCommand,
    updateInterestCommand,
    backToMainMenuCommand
} = require('./commands/profileCommands');
const { newCommand } = require('./commands/newCommand');
const { endCommand } = require('./commands/endCommand');
const { reportCommand } = require('./commands/reportCommand');

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
  if (userOnboardingState.has(ctx.user.id)) {
      userOnboardingState.delete(ctx.user.id);
      console.log(`Cleared active state for user ${ctx.user.id} due to /start command.`);
  }
  if (ctx.user.onboarding_complete) {
    if (ctx.user.status === 'in_chat' && ctx.user.partner_id) {
        console.log(`/start used by ${ctx.user.id} while in_chat with ${ctx.user.partner_id}. Ending chat.`)
        await endCommand(ctx);
        return;
    }
    await ctx.reply('Welcome back! You are all set up.', mainIdleMenuKeyboard);
  } else {
    await startOnboarding(ctx);
  }
});

bot.command('myprofile', async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete onboarding with /start first.");
        return;
    }
    if (userOnboardingState.has(ctx.user.id) && userOnboardingState.get(ctx.user.id).isUpdate) {
        userOnboardingState.delete(ctx.user.id);
    }
    await myProfileCommand(ctx);
});

bot.command('new', async (ctx) => {
    if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) {
        const banEnds = new Date(ctx.user.banned_until).toLocaleString();
        await ctx.reply(`You are currently banned from starting new chats until ${banEnds}.`);
        return;
    }
    await newCommand(ctx);
});
bot.command('end', endCommand);
bot.command('report', async (ctx) => {
     if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) {
        const banEnds = new Date(ctx.user.banned_until).toLocaleString();
        await ctx.reply(`You are currently banned and cannot report until ${banEnds}.`);
        return;
    }
    await reportCommand(ctx);
});

// --- Handlers for Keyboard Text ---
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
        await backToMainMenuCommand(ctx);
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
    await handleInterestResponse(ctx);
  } else if (ctx.user && ctx.user.onboarding_complete && (!state || !state.isUpdate) && ctx.user.status !== 'in_chat') {
    await ctx.reply("What would you like to do?", mainIdleMenuKeyboard);
  }
});

bot.hears(['Both'], async (ctx) => {
  const state = userOnboardingState.get(ctx.from.id);
  if (state && state.stage === ONBOARDING_STAGES.ASK_INTEREST) {
    await handleInterestResponse(ctx);
  } else if (state && state.stage === ONBOARDING_STAGES.ASK_GENDER) {
    await ctx.reply('Invalid gender. Please choose Male or Female.', genderKeyboard);
  } else if (ctx.user && ctx.user.onboarding_complete && (!state || !state.isUpdate) && ctx.user.status !== 'in_chat') {
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
});

// General Text Handler
bot.on('text', async (ctx) => {
  if (!ctx.user) return;

  // Check if user is banned BEFORE processing any text commands or chat messages
  // This check is now primarily in handleChatMessage for chat messages.
  // For commands, it's handled at the command level or here as a general guard.
  if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) {
      // Allow 'Back to Main Menu' or /start even if banned, to avoid being stuck.
      if (ctx.message.text === 'Back to Main Menu' || ctx.message.text.startsWith('/start')) {
          // Let these pass to their respective handlers.
      } else {
        const banEnds = new Date(ctx.user.banned_until).toLocaleString();
        await ctx.reply(`You are currently banned. This restriction will be lifted on ${banEnds}.`);
        return;
      }
  }

  const state = userOnboardingState.get(ctx.user.id);

  if (state) {
    switch (state.stage) {
      case ONBOARDING_STAGES.ASK_AGE:
        await handleAgeResponse(ctx);
        break;
      case ONBOARDING_STAGES.ASK_GENDER:
         await ctx.reply('Please choose from the Male/Female buttons.', genderKeyboard);
         break;
      case ONBOARDING_STAGES.ASK_INTEREST:
         await ctx.reply('Please choose from the Male/Female/Both buttons.', interestKeyboard);
         break;
      default:
        console.log(`Text '${ctx.message.text}' received in unhandled state: ${state.stage}`);
        break;
    }
  } else if (ctx.user.onboarding_complete) {
    if (ctx.user.status === 'idle') {
        if (ctx.message.text === '/new - Find a Chat Partner') {
            if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) { // Re-check ban for /new specifically
                const banEnds = new Date(ctx.user.banned_until).toLocaleString();
                await ctx.reply(`You are currently banned from starting new chats until ${banEnds}.`);
                return;
            }
            await newCommand(ctx);
        } else if (ctx.message.text === '/myprofile - View & Update Profile') {
            await myProfileCommand(ctx);
        } else if (ctx.message.text.startsWith('/')) {
            await ctx.reply("Unknown command. Please use the menu options or /start.", mainIdleMenuKeyboard);
        } else {
            await ctx.reply("What would you like to do?", mainIdleMenuKeyboard);
        }
    } else if (ctx.user.status === 'in_chat') {
        if (ctx.message.text === '/end - End Chat') {
            await endCommand(ctx);
        } else if (ctx.message.text === '/report - Report User') {
            if (ctx.user.banned_until && new Date(ctx.user.banned_until) > new Date()) { // Re-check ban for /report
                const banEnds = new Date(ctx.user.banned_until).toLocaleString();
                await ctx.reply(`You are currently banned and cannot report until ${banEnds}.`);
                return;
            }
            await reportCommand(ctx);
        }
        else {
            await handleChatMessage(ctx); // handleChatMessage now includes its own ban check
        }
    } else if (ctx.user.status === 'waiting') {
        await ctx.reply("Still looking for a partner for you. Please be patient!", Markup.removeKeyboard());
    }
  } else {
    await ctx.reply("Please /start the bot to begin setup.", Markup.removeKeyboard());
  }
});

// Global error handler
bot.catch(async (err, ctx) => {
  console.error(`Error for ${ctx.updateType} from user ${ctx.from?.id}:`, err);
  if (err.response && err.description) console.error("Telegram API Error:", err.description);

  if(ctx.from && ctx.from.id && userOnboardingState.has(ctx.from.id)){
    userOnboardingState.delete(ctx.from.id);
    console.log(`Cleared onboarding/update state for user ${ctx.from.id} due to error.`);
  }

  if (ctx.user) {
    if (ctx.user.status === 'waiting' || ctx.user.status === 'in_chat') {
      const currentPartnerId = ctx.user.partner_id;
      try {
        await userService.updateUser(ctx.user.id, { status: 'idle', partner_id: null });
        console.log(`User ${ctx.user.id} status reset to idle due to error.`);
        if (currentPartnerId) {
          await userService.updateUser(currentPartnerId, { status: 'idle', partner_id: null });
          console.log(`Partner ${currentPartnerId} status reset to idle due to error.`);
        }
      } catch (resetError) {
        console.error(`Failed to reset user status after error for user ${ctx.user.id}:`, resetError);
      }
    }
  }

  if (ctx.chat && ctx.chat.id) {
    try {
      await ctx.telegram.sendMessage(ctx.chat.id, 'Oops! Something went wrong. Please try again later. If the problem persists, try /start.');
    } catch (sendError) {
      console.error('Failed to send error message to user:', sendError);
    }
  }
});


const startupCleanup = async () => {
    console.log('Performing startup cleanup...');
    try {
        // Find users who were 'in_chat' or 'waiting'
        const usersToReset = await new Promise((resolve, reject) => {
            db.all("SELECT id FROM users WHERE status = 'in_chat' OR status = 'waiting'", (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });

        if (usersToReset.length > 0) {
            console.log(`Found ${usersToReset.length} users to reset status (in_chat/waiting).`);
            for (const user of usersToReset) {
                await userService.updateUser(user.id, { status: 'idle', partner_id: null });
                console.log(`User ${user.id} status reset to 'idle' at startup.`);
                // Notifying them is hard here as we don't have their ctx and they aren't interacting.
            }
        } else {
            console.log('No users found with active status (in_chat/waiting) at startup.');
        }
    } catch (error) {
        console.error('Error during startup cleanup:', error);
    }
};

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

// Launch the bot
startupCleanup().then(() => {
    bot.launch().then(() => {
      console.log('Bot started with content moderation and startup cleanup.');
    }).catch(err => {
      console.error('Failed to launch bot:', err);
    });
});

console.log('src/bot.js updated with content moderation hooks and startup cleanup.');
