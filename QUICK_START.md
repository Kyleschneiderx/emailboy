# Quick Start Guide

## Your Supabase Credentials

- **Project URL**: `https://xgllxidtqbkftsbhiinl.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4`

## Step 1: Set Up Database Table

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xgllxidtqbkftsbhiinl
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the entire contents of `setup.sql` file
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see success messages confirming the setup

## Step 2: Configure Extension

1. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `emailboy` folder

2. Configure Supabase:
   - Click the EmailBoy extension icon
   - Click "⚙️ Settings" at the bottom
   - Enter your credentials:
     - **Supabase Project URL**: `https://xgllxidtqbkftsbhiinl.supabase.co`
     - **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbGx4aWR0cWJrZnRzYmhpaW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNTY2NzEsImV4cCI6MjA3ODczMjY3MX0.gCK3wRjpVF-BFwaLrF_3P4Rb3-lbFPqeu7JxHRQKky4`
   - Check "Automatically sync to Supabase"
   - Click "Save Settings"
   - Click "Test Supabase Connection" to verify

## Step 3: Sign Up / Sign In

1. In the extension popup, you'll see a sign-in form
2. Click "Sign Up" to create an account
   - Enter your email
   - Enter a password (at least 6 characters)
   - Click "Sign Up"
3. Check your email for verification (if email confirmation is enabled in Supabase)
4. Sign in with your credentials

## Step 4: Start Collecting Emails

1. Browse the web normally
2. The extension will automatically scan pages for email addresses
3. Found emails will be stored locally and synced to Supabase
4. Click the extension icon to view collected emails

## Multi-User Support

✅ **Already configured!** The database setup includes:

- **Row Level Security (RLS)**: Each user can only see their own emails
- **Automatic user_id assignment**: Emails are automatically tagged with the user who collected them
- **Unique constraint**: The same email can be collected by different users (stored separately)

Multiple users can use the extension with the same Supabase database, and each will only see their own collected emails.

## Viewing Data in Supabase

1. Go to your Supabase dashboard
2. Click **Table Editor** in the left sidebar
3. Select the `collected_emails` table
4. You'll see all emails collected by all users
5. The `user_id` column shows which user collected each email
6. Each user's extension will only show emails where `user_id` matches their authenticated user ID

## Troubleshooting

### "Table does not exist" error
- Make sure you ran the `setup.sql` script in Supabase SQL Editor

### "Permission denied" error
- Verify Row Level Security policies are created
- Check that the trigger function `set_user_id()` exists

### "Not authenticated" error
- Make sure you've signed in through the extension popup
- Check that your Supabase URL and key are correct in settings

### Emails not syncing
- Verify "Automatically sync to Supabase" is enabled
- Check browser console for errors (F12 → Console)
- Make sure you're signed in

## Security Notes

- The anon key is safe to use in client-side code (it's public)
- Row Level Security ensures users can only access their own data
- Never share your `service_role` key (it bypasses RLS)

