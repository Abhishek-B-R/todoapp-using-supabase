# TodoApp with Supabase

This is a simple Todo application built using [Supabase](https://supabase.com/) as the backend.

## Features

- Add, update, edit, and delete todos
- Real-time updates using Supabase Subscriptions
- User authentication

## Getting Started

### Prerequisites

- Node.js & npm
- Supabase account

### Setup

1. **Clone the repository:**
  ```bash
  git clone https://github.com/Abhishek-B-R/todoapp-using-supabase.git
  cd todoapp-using-supabase
  ```

2. **Install dependencies:**
  ```bash
  npm install
  ```

3. **Configure Supabase:**
  - Create a new project on [Supabase](https://app.supabase.com/).
  - Copy your Supabase URL and anon key.
  - Create a `.env` file and add:
    ```
    VITE_SUPABASE_URL=your-supabase-url
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```

4. **Set up the database:**
  - Use the Supabase dashboard to create a `todos` table with columns:
    - `id` (uuid, primary key)
    - `task` (text)
    - `is_complete` (boolean)
    - `user_id` (uuid, optional for auth)
    - `image_url` (text)

5. **Run the app:**
  ```bash
  npm run dev
  ```

## Usage

- Add a new todo using the input field.
- Edit or delete todos as needed.

## License

MIT
