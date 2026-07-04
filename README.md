# Mimic Daily

A Reddit-native daily social deduction game where players answer a prompt today, then return tomorrow to guess which anonymous responses were written by a Human, AI, or Hybrid.

Mimic Daily is built around a simple loop:

```text
Write today -> Investigate tomorrow -> Reveal results -> Earn XP -> Come back again
```

## Built With

* [Devvit Web](https://developers.reddit.com/): For building and deploying the game on Reddit
* [React](https://react.dev/): For the user interface
* [TypeScript](https://www.typescriptlang.org/): For type safety
* [Vite](https://vite.dev/): For building the webView
* [Tailwind CSS](https://tailwindcss.com/): For styling
* [Hono](https://hono.dev/): For backend API routes
* [Node.js](https://nodejs.org/): For the development environment
* Redis / Devvit Storage: For saving prompts, answers, votes, XP, streaks, and leaderboard data
* Gemini API: For AI responses, moderation, and adaptive prompt generation

## What It Does

Each day, players answer a creative prompt and explain their response.

The next day, those answers are mixed with AI-generated and Hybrid responses. Players investigate the anonymous responses and vote on whether each one was written by:

* Human
* AI
* Hybrid

After voting, players see the reveal, earn XP, build streaks, unlock achievements, and climb the leaderboard.

## Core Features

* Daily question system
* Human vs AI investigation rounds
* Hybrid response category
* XP and leveling
* Daily streaks
* Achievements
* Player history
* Leaderboard
* Gemini-powered AI responses
* AI moderation for profanity and off-topic answers
* Prompt-based AI evolution
* Mobile-friendly UI
* Simulate day tool for testing the full daily loop

## AI Evolution

Mimic Daily uses Gemini to create AI responses, but the AI does not stay the same forever.

Each day, the game stores information such as:

* Which AI answers fooled players
* Which AI answers were easy to catch
* Which human answers seemed most believable
* What explanations players gave for their guesses
* How accurate the community was

That feedback is used in future Gemini prompts so the AI becomes harder to detect over time.

The goal is to make the AI feel like a persistent opponent called **The Mimic** that learns from the community.

## Getting Started

> Make sure you have Node.js installed before running the project.

1. Clone the repository:

```bash
git clone https://github.com/unknown10998/daily-mimic.git
```

2. Go into the project folder:

```bash
cd daily-mimic
```

3. Install dependencies:

```bash
npm install
```

4. Log in to Devvit:

```bash
npm run login
```

5. Start the development server:

```bash
npm run dev
```

## Environment Variables

Create a `.env` file in the root of the project.

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Do not upload your `.env` file to GitHub.

## Commands

* `npm run dev`: Starts a development server where you can develop the app live on Reddit
* `npm run build`: Builds the client and server projects
* `npm run deploy`: Uploads a new version of the app
* `npm run launch`: Publishes the app for review
* `npm run login`: Logs your CLI into Reddit
* `npm run type-check`: Type checks, lints, and formats the app

## Project Structure

```text
src/
├── client/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── types/
│
├── server/
│   ├── api/
│   ├── controllers/
│   ├── services/
│   ├── storage/
│   ├── gemini/
│   ├── utils/
│   └── types/
│
└── devvit.json
```

## Why This Project

Mimic Daily was inspired by one question:

> Can Reddit still recognize a human voice when AI is learning from the crowd?

Instead of making AI the entire experience, Mimic Daily uses AI as the opponent. The real game is the community: writing, guessing, debating, and learning what makes something sound human.

## Future Plans

* Subreddit-specific prompt packs
* Weekly seasons
* Community flair rewards
* Richer result breakdowns
* Post-reveal discussions
* More advanced AI evolution
* Better moderator controls
* Expanded achievement paths

## Summary

Mimic Daily turns AI detection into a daily Reddit ritual:

```text
Write today.
Investigate tomorrow.
See if the community can still spot the machine.
```