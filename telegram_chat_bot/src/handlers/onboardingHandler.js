const { Markup } = require('telegraf');
const userService = require('../services/userService');
const keyboards = require('../constants/keyboards'); // Import all keyboards
const { ONBOARDING_STAGES } = require('../constants/onboardingStages');

const userOnboardingState = new Map(); // userId -> { stage: ONBOARDING_STAGES.XYZ, data: {}, isUpdate?: boolean }

const startOnboarding = async (ctx) => {
  if (!ctx.user) return ctx.reply("Something went wrong, please try /start again.");
  console.log(`Starting onboarding for user ${ctx.user.id}.`);
  userOnboardingState.set(ctx.user.id, { stage: ONBOARDING_STAGES.ASK_GENDER, data: {}, isUpdate: false });
  await askGender(ctx);
};

const askGender = async (ctx) => {
  const state = userOnboardingState.get(ctx.user.id) || { stage: ONBOARDING_STAGES.ASK_GENDER, data: {}, isUpdate: false };
  state.stage = ONBOARDING_STAGES.ASK_GENDER;
  userOnboardingState.set(ctx.user.id, state);
  await ctx.reply(state.isUpdate ? 'Select your new gender:' : 'Welcome! To get started, please select your gender:', keyboards.genderKeyboard);
};

const handleGenderResponse = async (ctx) => {
  const userId = ctx.from.id;
  const gender = ctx.message.text;

  if (gender !== 'Male' && gender !== 'Female') {
    await ctx.reply('Invalid selection. Please choose your gender from the keyboard:', keyboards.genderKeyboard);
    return;
  }

  const state = userOnboardingState.get(userId);
  if (!state || state.stage !== ONBOARDING_STAGES.ASK_GENDER) {
    console.log(`User ${userId} sent gender response but not in ASK_GENDER stage.`);
    return;
  }

  state.data.gender = gender;

  if (state.isUpdate) {
    try {
      await userService.updateUser(userId, { gender: state.data.gender });
      if(ctx.user) ctx.user.gender = state.data.gender;
      await ctx.reply(`Gender updated to ${state.data.gender}.`, keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    } catch (error) {
      console.error('Error updating gender for user:', userId, error);
      await ctx.reply('There was an error saving your gender. Please try again.', keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    }
  } else {
    state.stage = ONBOARDING_STAGES.ASK_AGE;
    userOnboardingState.set(userId, state);
    console.log(`User ${userId} selected gender: ${gender}. Proceeding to age.`);
    await askAge(ctx);
  }
};

const askAge = async (ctx) => {
  const state = userOnboardingState.get(ctx.user.id) || { stage: ONBOARDING_STAGES.ASK_AGE, data: {}, isUpdate: false };
  state.stage = ONBOARDING_STAGES.ASK_AGE;
  userOnboardingState.set(ctx.user.id, state);
  await ctx.reply(state.isUpdate ? 'Enter your new age:' : 'Great! Now, please tell me your age (e.g., 25).', Markup.removeKeyboard());
};

const handleAgeResponse = async (ctx) => {
  const userId = ctx.from.id;
  const ageText = ctx.message.text;
  const age = parseInt(ageText, 10);

  const state = userOnboardingState.get(userId);
  if (!state || state.stage !== ONBOARDING_STAGES.ASK_AGE) {
    console.log(`User ${userId} sent age but not in ASK_AGE stage.`);
    return;
  }

  if (isNaN(age) || age < 13 || age > 99) {
    await ctx.reply('Please enter a valid age between 13 and 99.');
    return;
  }

  state.data.age = age;

  if (state.isUpdate) {
    try {
      await userService.updateUser(userId, { age: state.data.age });
      if(ctx.user) ctx.user.age = state.data.age;
      await ctx.reply(`Age updated to ${state.data.age}.`, keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    } catch (error) {
      console.error('Error updating age for user:', userId, error);
      await ctx.reply('There was an error saving your age. Please try again.', keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    }
  } else {
    state.stage = ONBOARDING_STAGES.ASK_LOCATION;
    userOnboardingState.set(userId, state);
    console.log(`User ${userId} entered age: ${age}. Proceeding to location.`);
    await askLocation(ctx);
  }
};

const askLocation = async (ctx) => {
  const state = userOnboardingState.get(ctx.user.id) || { stage: ONBOARDING_STAGES.ASK_LOCATION, data: {}, isUpdate: false };
  state.stage = ONBOARDING_STAGES.ASK_LOCATION;
  userOnboardingState.set(ctx.user.id, state);
  await ctx.reply(state.isUpdate ? 'Share your new location:' : 'Thanks! Now, please share your location.', keyboards.locationKeyboard);
};

const handleLocationResponse = async (ctx) => {
  const userId = ctx.from.id;
  const location = ctx.message.location;

  if (!location) {
    await ctx.reply('Could not read location. Please use the "Share My Location" button.', keyboards.locationKeyboard);
    return;
  }

  const state = userOnboardingState.get(userId);
  if (!state || state.stage !== ONBOARDING_STAGES.ASK_LOCATION) {
     console.log(`User ${userId} sent location but not in ASK_LOCATION stage.`);
    return;
  }

  state.data.latitude = location.latitude;
  state.data.longitude = location.longitude;

  if (state.isUpdate) {
    try {
      await userService.updateUser(userId, { latitude: state.data.latitude, longitude: state.data.longitude });
      if(ctx.user) {
        ctx.user.latitude = state.data.latitude;
        ctx.user.longitude = state.data.longitude;
      }
      await ctx.reply("Location updated successfully.", keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    } catch (error) {
      console.error('Error updating location for user:', userId, error);
      await ctx.reply('There was an error saving your location. Please try again.', keyboards.updateProfileKeyboard);
      userOnboardingState.delete(userId);
    }
  } else {
    state.stage = ONBOARDING_STAGES.ASK_INTEREST;
    userOnboardingState.set(userId, state);
    console.log(`User ${userId} shared location. Proceeding to interest.`);
    await askInterest(ctx);
  }
};

const askInterest = async (ctx) => {
  const state = userOnboardingState.get(ctx.user.id) || { stage: ONBOARDING_STAGES.ASK_INTEREST, data: {}, isUpdate: false };
  state.stage = ONBOARDING_STAGES.ASK_INTEREST;
  userOnboardingState.set(ctx.user.id, state);
  await ctx.reply(state.isUpdate ? 'Who are you interested in meeting now?' : 'Almost done! Who are you interested in meeting?', keyboards.interestKeyboard);
};

const handleInterestResponse = async (ctx) => {
  const userId = ctx.from.id;
  const interest = ctx.message.text;

  if (!['Male', 'Female', 'Both'].includes(interest)) {
    await ctx.reply('Invalid selection. Please choose your interest from the keyboard:', keyboards.interestKeyboard);
    return;
  }

  const state = userOnboardingState.get(userId);
  if (!state || state.stage !== ONBOARDING_STAGES.ASK_INTEREST) {
    console.log(`User ${userId} sent interest but not in ASK_INTEREST stage.`);
    return;
  }
  state.data.interested_in = interest;

  try {
    if (state.isUpdate) {
      await userService.updateUser(userId, { interested_in: state.data.interested_in });
      if(ctx.user) ctx.user.interested_in = state.data.interested_in;
      userOnboardingState.delete(userId);
      await ctx.reply(`Interest updated to ${state.data.interested_in}.`, keyboards.updateProfileKeyboard);
    } else {
      // This is the original full onboarding completion logic
      await userService.updateUser(userId, {
        gender: state.data.gender,
        age: state.data.age,
        latitude: state.data.latitude,
        longitude: state.data.longitude,
        interested_in: state.data.interested_in,
        onboarding_complete: true,
        status: 'idle'
      });

      const updatedUser = await userService.getUserById(userId);
      if (updatedUser && ctx.user) Object.assign(ctx.user, updatedUser);
      else if (updatedUser) ctx.user = updatedUser;

      userOnboardingState.delete(userId);
      console.log(`User ${userId} completed onboarding. Data:`, state.data);
      await ctx.reply('Onboarding complete! You can now use /new to find a chat partner.', keyboards.mainIdleMenuKeyboard);
    }
  } catch (error) {
    console.error('Error saving user data for user:', userId, error);
    await ctx.reply('There was an error saving your information. Please try again later.');
    userOnboardingState.delete(userId);
  }
};

const resumeOnboarding = async (ctx) => {
    if (!ctx.user || ctx.user.onboarding_complete) return;

    console.log(`Resuming onboarding for user ${ctx.user.id}`);
    const currentData = {
        gender: ctx.user.gender,
        age: ctx.user.age,
        latitude: ctx.user.latitude,
        longitude: ctx.user.longitude,
        interested_in: ctx.user.interested_in
    };

    // Ensure isUpdate is false for resume
    if (!ctx.user.gender) {
        userOnboardingState.set(ctx.user.id, { stage: ONBOARDING_STAGES.ASK_GENDER, data: currentData, isUpdate: false });
        await askGender(ctx);
    } else if (ctx.user.age === null || ctx.user.age === undefined) {
        userOnboardingState.set(ctx.user.id, { stage: ONBOARDING_STAGES.ASK_AGE, data: currentData, isUpdate: false });
        await askAge(ctx);
    } else if (ctx.user.latitude === null || ctx.user.latitude === undefined) {
        userOnboardingState.set(ctx.user.id, { stage: ONBOARDING_STAGES.ASK_LOCATION, data: currentData, isUpdate: false });
        await askLocation(ctx);
    } else if (!ctx.user.interested_in) {
        userOnboardingState.set(ctx.user.id, { stage: ONBOARDING_STAGES.ASK_INTEREST, data: currentData, isUpdate: false });
        await askInterest(ctx);
    } else { // Should be complete, but if not, mark it.
        await userService.updateUser(ctx.user.id, { onboarding_complete: true, status: 'idle' });
        if(ctx.user) ctx.user.onboarding_complete = true;
        await ctx.reply('It seems your onboarding was nearly complete! You are all set now.', keyboards.mainIdleMenuKeyboard);
    }
};

module.exports = {
  startOnboarding,
  askGender, handleGenderResponse,
  askAge, handleAgeResponse,
  askLocation, handleLocationResponse,
  askInterest, handleInterestResponse,
  userOnboardingState,
  ONBOARDING_STAGES,
  resumeOnboarding
};

console.log('src/handlers/onboardingHandler.js rewritten with isUpdate logic.');
