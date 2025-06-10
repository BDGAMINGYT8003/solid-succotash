const userService = require('./userService'); // Assuming userService has methods to get/update users
const { db } = require('../database/database'); // For direct DB access if needed for sessions

const findMatch = async (currentUser) => {
    console.log(`Attempting to find match for user ${currentUser.id} (Gender: ${currentUser.gender}, Interested In: ${currentUser.interested_in})`);

    // Fetch all users who are also 'waiting'
    const waitingUsers = await userService.getUsersByStatus('waiting');
    if (!waitingUsers || waitingUsers.length === 0) {
        console.log("No other users are currently waiting.");
        return null;
    }

    console.log(`Found ${waitingUsers.length} users waiting (including current if requeued).`);

    for (const potentialPartner of waitingUsers) {
        // Don't match user with themselves
        if (potentialPartner.id === currentUser.id) {
            console.log(`Skipping self-match for ${currentUser.id}`);
            continue;
        }

        // Check compatibility based on gender and interest
        // User A (currentUser): Gender G_A, Interested_In I_A
        // User B (potentialPartner): Gender G_B, Interested_In I_B
        // Match if:
        // (G_A is in I_B OR I_B is "Both") AND (G_B is in I_A OR I_A is "Both")

        const currentUserLikesPartnerGender = currentUser.interested_in === potentialPartner.gender || currentUser.interested_in === 'Both';
        const partnerLikesCurrentUserGender = potentialPartner.interested_in === currentUser.gender || potentialPartner.interested_in === 'Both';

        console.log(`Checking compatibility: ${currentUser.id} vs ${potentialPartner.id}`);
        console.log(`  ${currentUser.id} (G:${currentUser.gender}, I:${currentUser.interested_in}) likes ${potentialPartner.id} (G:${potentialPartner.gender})? ${currentUserLikesPartnerGender}`);
        console.log(`  ${potentialPartner.id} (G:${potentialPartner.gender}, I:${potentialPartner.interested_in}) likes ${currentUser.id} (G:${currentUser.gender})? ${partnerLikesCurrentUserGender}`);


        if (currentUserLikesPartnerGender && partnerLikesCurrentUserGender) {
            console.log(`Compatible match found: ${currentUser.id} with ${potentialPartner.id}`);
            try {
                // Update both users' status to 'in_chat' and set partner_id
                // This should be atomic or handled carefully to avoid race conditions.
                // For simplicity, we do it sequentially. A transaction would be better.
                await userService.updateUser(currentUser.id, { status: 'in_chat', partner_id: potentialPartner.id });
                await userService.updateUser(potentialPartner.id, { status: 'in_chat', partner_id: currentUser.id });

                // Update the objects passed in context as well for immediate use
                currentUser.status = 'in_chat';
                currentUser.partner_id = potentialPartner.id;
                // We don't have potentialPartner's context here, but its DB record is updated.
                // The newCommand for the partner (if they initiated) would handle their context.
                // If partner was just waiting, their next interaction will reflect the change.

                console.log(`Users ${currentUser.id} and ${potentialPartner.id} statuses updated to 'in_chat'.`);

                // Return the matched pair
                // Ensure the returned user objects are the full objects, not just IDs or partial data.
                // The userService.updateUser might not return the full updated object.
                // It's safer to fetch them again or ensure updateUser returns the updated object.
                // For now, assuming currentUser object is modified by reference and potentialPartner is from waitingUsers list.
                const updatedCurrentUser = await userService.getUserById(currentUser.id);
                const updatedPotentialPartner = await userService.getUserById(potentialPartner.id);

                return { user1: updatedCurrentUser, user2: updatedPotentialPartner };
            } catch (error) {
                console.error('Error updating users for match:', error);
                // Rollback status if one update failed? Complex. For now, log and continue searching.
                // This could leave one user in 'in_chat' and other 'waiting'. Needs robust handling.
                // Simple rollback:
                await userService.updateUser(currentUser.id, { status: 'waiting', partner_id: null });
                // Only rollback partner if their status was indeed changed by this attempt.
                // This requires more state or reading before writing.
                // For now, assume partner's status might also need reset if error occurred after their update.
                await userService.updateUser(potentialPartner.id, { status: 'waiting', partner_id: null }); // Potential issue if partner wasn't updated yet.
                return null; // Indicate match setup failed
            }
        }
    }
    console.log(`No compatible match found for ${currentUser.id} among waiting users.`);
    return null; // No match found
};

const createChatSession = (user1_id, user2_id) => {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO sessions (user1_id, user2_id) VALUES (?, ?)';
    db.run(sql, [user1_id, user2_id], function(err) {
      if (err) {
        console.error('Error creating chat session:', err.message);
        return reject(err);
      }
      console.log(`Chat session created with ID: ${this.lastID} for users ${user1_id} and ${user2_id}`);
      resolve(this.lastID);
    });
  });
};


module.exports = {
    findMatch,
    createChatSession
};
console.log('src/services/matchingService.js created.');
