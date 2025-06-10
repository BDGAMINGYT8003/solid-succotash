const { userOnboardingState, ONBOARDING_STAGES, resumeOnboarding, startOnboarding } = require('../handlers/onboardingHandler');

const onboardingMiddleware = async (ctx, next) => {
  // Ensure user context exists from previous middleware
  if (!ctx.user) {
    // This should ideally be handled by userMiddleware sending a reply or blocking
    // console.warn('OnboardingMiddleware: ctx.user is not defined. Skipping.');
    return next(); // Or ctx.reply('Please /start the bot first.');
  }

  // Allow specific commands/actions even if onboarding is not complete
  const command = ctx.message?.text?.split(' ')[0]; // e.g. /start
  const updateType = ctx.updateType;
  const currentOnboardingSession = userOnboardingState.get(ctx.user.id);

  // Always allow /start command through. /start will decide if onboarding is needed.
  if (command === '/start') {
    return next();
  }

  // If user is actively in an onboarding stage, let their message be processed by main handlers
  // which should route to onboardingHandler based on stage.
  if (currentOnboardingSession) {
    // console.log(`OnboardingMiddleware: User ${ctx.user.id} is in stage ${currentOnboardingSession.stage}. Allowing update.`);
    return next();
  }

  // If onboarding is complete, proceed to next middleware/handler
  if (ctx.user.onboarding_complete) {
    return next();
  }

  // If onboarding is NOT complete and they are NOT in an active session (e.g. after bot restart)
  // and the command is not /start:
  // We should try to resume onboarding.
  // Any message or command other than /start should trigger resumeOnboarding.
  // console.log(`OnboardingMiddleware: User ${ctx.user.id} onboarding not complete and not in active session. Attempting to resume.`);
  await ctx.reply("Let's get you set up first!");
  await resumeOnboarding(ctx); // This will ask the appropriate question
  return; // Stop further processing of this update by other handlers

  // Fallback: if none of the above, and onboarding not complete, prompt to start.
  // This should ideally be covered by resumeOnboarding.
  // await ctx.reply('Please complete the onboarding process to use other bot features. Let me guide you through it.');
  // await startOnboarding(ctx); // Or resumeOnboarding(ctx)
  // return;
};

module.exports = { onboardingMiddleware };

console.log('src/middlewares/onboardingMiddleware.js created successfully.');
