# Anonymous Chat Telegram Bot

This is a Telegraf-based Telegram bot, built with Node.js, that anonymously connects two random users for one-on-one conversations.

## Features

*   **Anonymous Matching**: Connects users based on mutual interest compatibility (gender and interested in preferences).
*   **Onboarding**: Mandatory multi-step onboarding for new users:
    *   Gender selection (Male/Female)
    *   Age input (validated)
    *   Location sharing (for context, shown approximately)
    *   "Interested In" selection (Male/Female/Both)
*   **Profile Management**:
    *   View your profile with `/myprofile`.
    *   Update Gender, Age, Location, or "Interested In" preferences at any time.
*   **Chat Functionality**:
    *   Seamless message forwarding between paired users.
    *   "Typing..." indicator.
*   **Chat Controls**:
    *   End current chat with `/end` command or "End Chat" button.
*   **User Safety**:
    *   Report chat partners with `/report` command or "Report User" button.
    *   Reporting logs the incident, warns the reported user, and ends the chat.
    *   Basic content moderation (keyword blacklist): blocks offensive messages, warns sender.
    *   Accumulated warnings lead to temporary bans.
    *   Rate limiting and message length caps to prevent spam.
*   **Persistent Data**: User profiles, onboarding status, session metadata (participants, start/end times), reports, warnings, and ban details are stored in an SQLite database.
*   **Privacy**: Message contents are not stored.
*   **Error Handling**: Includes measures for graceful error handling and state consistency, including on bot restarts.

## Setup and Running the Bot

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 14.x or higher recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Installation

1.  **Clone the repository (if you haven't already):**
    ```bash
    # git clone <repository-url>
    # cd <repository-directory>
    ```

2.  **Install dependencies:**
    Navigate to the project's root directory (where `package.json` is located) and run:
    ```bash
    npm install
    ```

### Configuration

The Telegram Bot Token is currently hardcoded in `src/bot.js` as per the development instructions:
`const BOT_TOKEN = '7947606721:AAGxfrYl1HI86IRkYKbIyhwkmq4cu2Pb-vo';`

**Important**: For a production environment, this token should be moved to an environment variable (e.g., `process.env.BOT_TOKEN`) and not be hardcoded.

### Running the Bot

Once dependencies are installed, you can start the bot using:

```bash
node src/bot.js
```

Alternatively, after the `package.json` is updated with a start script (next step in the plan), you can use:

```bash
npm start
```

The bot will connect to Telegram and start processing updates.

## Project Structure

*   `src/`: Contains the main source code.
    *   `bot.js`: Main bot entry point, Telegraf setup, command/message routing.
    *   `commands/`: Handlers for specific bot commands (e.g., `/new`, `/end`, `/report`, `/myprofile`).
    *   `handlers/`: Handlers for different types of events (e.g., messages, onboarding steps).
    *   `services/`: Business logic (e.g., user management, matching).
    *   `database/`: Database setup and schema (`database.js`).
    *   `middlewares/`: Custom Telegraf middlewares (e.g., user context, onboarding enforcement).
    *   `constants/`: Static values like keyboard layouts and stage names.
*   `db/`: Contains the SQLite database file (`chat_bot.sqlite`).
*   `package.json`: Project metadata and dependencies.
*   `README.md`: This file.
