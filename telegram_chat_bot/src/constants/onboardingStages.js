const ONBOARDING_STAGES = Object.freeze({
  ASK_GENDER: 'ASK_GENDER',
  ASK_AGE: 'ASK_AGE',
  ASK_LOCATION: 'ASK_LOCATION',
  ASK_INTEREST: 'ASK_INTEREST',
  COMPLETED: 'COMPLETED'
});

// Could also store expected response types or validation logic here per stage
// e.g., STAGE_CONFIG = { [ONBOARDING_STAGES.ASK_GENDER]: { expected_input: 'text', valid_options: ['Male', 'Female'] } }

module.exports = {
    ONBOARDING_STAGES
};

console.log('src/constants/onboardingStages.js created successfully.');
