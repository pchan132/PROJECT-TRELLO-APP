# Trello Clone Setup Guide

## 1. Supabase Setup

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Create a new project
4. Wait for the project to be ready

### Setup Database

1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the content from `setup-database.sql`
3. Run the SQL script to create all tables and policies

### Get Environment Variables

1. Go to Settings > API in your Supabase dashboard
2. Copy the following values:
   - Project URL
   - Public anon key

## 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase credentials.

## 3. Features

### Authentication

- Sign up and sign in with email/password
- Protected routes (must be logged in to access boards)
- Row Level Security (users can only see their own data)

### Boards

- Create multiple boards per user
- Each board automatically gets "To Do", "In Progress", and "Done" columns
- Add custom columns to any board

### Cards

- Add cards to any column
- Drag and drop cards between columns
- Edit and delete cards
- Cards are automatically ordered

### Real-time Sync

- All changes are saved to Supabase automatically
- Data persists across browser sessions
- Secure multi-user support

## 4. Running the Application

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`

## 5. Authentication Setup

The authentication is already configured with the existing Supabase setup in the project. Users can:

- Sign up for new accounts
- Sign in with existing accounts
- Sign out
- Access protected routes only when authenticated

All user data is automatically isolated using Row Level Security (RLS) policies.
