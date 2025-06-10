const { Markup } = require('telegraf');

const genderKeyboard = Markup.keyboard([
  ['Male', 'Female']
]).resize().oneTime(); // oneTime makes the keyboard hide after a button is pressed

const interestKeyboard = Markup.keyboard([
  ['Male', 'Female'],
  ['Both']
]).resize().oneTime();

const locationKeyboard = Markup.keyboard([
  Markup.button.locationRequest('Share My Location')
]).resize().oneTime();

const mainIdleMenuKeyboard = Markup.keyboard([
  ['/new - Find a Chat Partner'],
  ['/myprofile - View & Update Profile']
]).resize();

const inChatMenuKeyboard = Markup.keyboard([
  ['/end - End Chat'],
  ['/report - Report User']
]).resize();

const updateProfileKeyboard = Markup.keyboard([
    ['Update Gender', 'Update Age'],
    ['Update Location', 'Update Interest'],
    ['Back to Main Menu']
]).resize();


module.exports = {
  genderKeyboard,
  interestKeyboard,
  locationKeyboard,
  mainIdleMenuKeyboard,
  inChatMenuKeyboard,
  updateProfileKeyboard,
};

console.log('src/constants/keyboards.js created successfully.');
