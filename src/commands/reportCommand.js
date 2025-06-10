const userService = require('../services/userService');
const { endCommand } = require('./endCommand');
const { db } = require('../database/database');
const { mainIdleMenuKeyboard, inChatMenuKeyboard } = require('../constants/keyboards');

const logReport = (reporterId, reportedId, reason = null) => {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)';
        db.run(sql, [reporterId, reportedId, reason], function(err) {
            if (err) {
                console.error('Error logging report:', err.message);
                return reject(err);
            }
            console.log(`Report logged: ID ${this.lastID}, ${reporterId} reported ${reportedId}`);
            resolve(this.lastID);
        });
    });
};

const reportCommand = async (ctx) => {
    if (!ctx.user || ctx.user.status !== 'in_chat' || !ctx.user.partner_id) {
        await ctx.reply("You can only report a user while you are in a chat.", mainIdleMenuKeyboard);
        return;
    }

    const reporterId = ctx.user.id;
    const reportedId = ctx.user.partner_id;

    try {
        await logReport(reporterId, reportedId);

        const reportedUser = await userService.getUserById(reportedId);
        if (reportedUser) {
            const newWarnings = (reportedUser.warnings || 0) + 1;
            await userService.updateUser(reportedId, { warnings: newWarnings });
            console.log(`User ${reportedId} warnings incremented to ${newWarnings}.`);
            // Future: Add ban logic based on newWarnings count.
        } else {
            console.warn(`Could not find reported user ${reportedId} to update warnings.`);
        }

        await ctx.reply("The user has been reported. The chat will now end.", mainIdleMenuKeyboard);

        console.log(`Report action: Ending chat between ${reporterId} and ${reportedId} after report.`);
        await endCommand(ctx);

    } catch (error) {
        console.error(`Error in /report command by user ${reporterId} against ${reportedId}:`, error);
        await ctx.reply("An error occurred while trying to report the user. Please try again.", inChatMenuKeyboard);
    }
};

module.exports = { reportCommand };
// console.log('src/commands/reportCommand.js created.'); // Optional: keep for confirmation
