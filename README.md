# SpendWise

A mobile expense tracker built with React Native (Expo) and Appwrite. Log expenses, review them with a swipe, and see where your money goes.

## Features

- Email/password authentication with session restore and protected routes
- Add expenses with title, amount, category, note, and date
- Swipe right to mark an expense as reviewed, swipe left to delete
- Month-to-date spending summary compared with last month
- Statistics with weekly and monthly views: category donut chart, top 3 biggest expenses, and spending per day

## Tech stack

React Native, Expo, TypeScript, Expo Router, React Native Paper, Appwrite (Auth and TablesDB), react-native-svg, react-native-gesture-handler, expo-linear-gradient

## Getting started

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/iyiade08/spend-wise.git
   cd spend-wise
   npm install
   ```

2. Create a `.env` file in the project root using `.env.example` as a guide, and fill in your own Appwrite values.

3. Start the app:

   ```bash
   npx expo start
   ```

## Appwrite setup

Create an Appwrite project with a database containing two tables:

- **Expenses:** `user_id`, `title`, `amount` (float), `category`, `notes`, `date` (datetime), `last_reviewed_at` (datetime)
- **Reviewed expenses:** `user_id`, `expense_id`, `title`, `completed_at` (datetime)

Give the Users role create, read, update and delete permissions on both tables.
