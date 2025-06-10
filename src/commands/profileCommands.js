const { Markup } = require('telegraf');
const userService = require('../services/userService');
const {
    askGender,
    askAge,
    askLocation,
    askInterest,
    userOnboardingState,
    ONBOARDING_STAGES
} = require('../handlers/onboardingHandler');
const { mainIdleMenuKeyboard, updateProfileKeyboard } = require('../constants/keyboards');

const myProfileCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete the onboarding process first via /start.");
        return;
    }

    const { gender, age, interested_in, latitude, longitude } = ctx.user;
    let profileMessage = "✨ *Your Profile* ✨\n\n";
    profileMessage += `👤 Gender: *${gender || 'Not set'}*\n`;
    profileMessage += `🎂 Age: *${age !== null && age !== undefined ? age : 'Not set'}*\n`;
    profileMessage += `💖 Interested in: *${interested_in || 'Not set'}*\n`;
    profileMessage += `📍 Location: *${latitude && longitude ? 'Set (approx.)' : 'Not set'}*\n\n`;
    profileMessage += "Choose an option to update below, or go back to the main menu.";

    await ctx.replyWithMarkdown(profileMessage, updateProfileKeyboard);
};

const updateGenderCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete the onboarding process first.");
        return;
    }
    userOnboardingState.set(ctx.user.id, {
        stage: ONBOARDING_STAGES.ASK_GENDER,
        isUpdate: true,
        data: {}
    });
    await askGender(ctx);
};

const updateAgeCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete the onboarding process first.");
        return;
    }
    userOnboardingState.set(ctx.user.id, {
        stage: ONBOARDING_STAGES.ASK_AGE,
        isUpdate: true,
        data: {}
    });
    await askAge(ctx);
};

const updateLocationCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete the onboarding process first.");
        return;
    }
    userOnboardingState.set(ctx.user.id, {
        stage: ONBOARDING_STAGES.ASK_LOCATION,
        isUpdate: true,
        data: {}
    });
    await askLocation(ctx);
};

const updateInterestCommand = async (ctx) => {
    if (!ctx.user || !ctx.user.onboarding_complete) {
        await ctx.reply("Please complete the onboarding process first.");
        return;
    }
    userOnboardingState.set(ctx.user.id, {
        stage: ONBOARDING_STAGES.ASK_INTEREST,
        isUpdate: true,
        data: {}
    });
    await askInterest(ctx);
};

const backToMainMenuCommand = async (ctx) => {
    if (userOnboardingState.has(ctx.from.id)) {
        userOnboardingState.delete(ctx.from.id);
    }
    await ctx.reply("Returning to main menu.", mainIdleMenuKeyboard);
};

module.exports = {
    myProfileCommand,
    updateGenderCommand,
    updateAgeCommand,
    updateLocationCommand,
    updateInterestCommand,
    backToMainMenuCommand
};

console.log('src/commands/profileCommands.js created successfully.');
