# Challenge App

A simple Node/Express application for tracking daily fitness challenges. The app uses a PostgreSQL database and serves a small client from the `public/` folder.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Update the values in `.env` for your environment. At minimum set `DATABASE_URL` to your Postgres connection string. You can also change `PORT` if needed.

3. **Start the server**
   ```bash
   npm start
   ```
   The server defaults to port `3000`.

## Usage

Open `http://localhost:3000` in your browser after starting the server. You can create users, join challenges and track daily progress. The API endpoints are defined in `server.js` and the frontend logic lives in the `public/` directory.

## Deploying

The project works on platforms such as Railway. Ensure your environment variables are set appropriately in your deployment settings.
