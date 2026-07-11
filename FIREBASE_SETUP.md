# Firebase Setup — Pure Serverless Client Setup

This application has been successfully configured to run entirely on client-side Firebase (Hosting + Realtime Database) with no Vercel backend required.

## Step 1: Create Realtime Database
1. Go to console.firebase.google.com
2. Left sidebar → Build → Realtime Database
3. Click "Create Database"
4. Choose region: asia-southeast1 (Singapore — lowest latency for India)
5. Start in TEST MODE → Enable
6. Copy the database URL: `https://fmos-a6573-default-rtdb.firebaseio.com/`

## Step 2: Set Security Rules (Important)
Since the app executes transactions and updates directly from the React client, you must configure the database security rules to allow read/write:

1. Realtime Database → Rules tab
2. Paste this rule configuration:
```json
{
  "rules": {
    "fms": {
      ".read": true,
      ".write": true
    }
  }
}
```
3. Click "Publish".

## Step 3: Deployment
To rebuild and deploy any new code changes, open your cmd terminal in the project folder and run:
```cmd
npm run build
firebase deploy --only hosting:fmos --project fmos-a6573
```
