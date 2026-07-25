# AI Quiz Generator 🚀

AI Quiz Generator is a responsive, feature-rich web application that reads custom text inputs or uploaded documents (PDFs) and uses the Google Gemini API to generate instant interactive quizzes. It features a local PHP + MySQL authentication backend with secure bcrypt hashing, a practice study mode with instant grading and explanations, and an AI tutor chatbot.

---

## 🌟 Key Features

*   **AI-Powered Quiz Generation**: Enter text or upload a PDF document (extracted on the client side using `pdf.js`) and generate custom multiple-choice quizzes using Google's Gemini Models (`gemini-2.5-flash`, `gemini-2.0-flash`, or `gemini-1.5-flash`).
*   **PHP & MySQL Authentication Backend**: Secure User Sign Up and Login flows featuring:
    *   Secure password storage using **Bcrypt hashing** (`password_hash` and `password_verify`).
    *   Comprehensive client-side (jQuery) and server-side (PHP) form validations.
    *   Auto-initialization: The backend automatically boots up, creates the database (`quiz_db`), and sets up the `users` schema on first load.
*   **Practice Mode**: An interactive learning interface that:
    *   Provides instant correct/incorrect visual feedback upon selecting a choice.
    *   Locks inputs and opens inline explanations showing the logic behind the correct answer.
    *   Includes an **AI Clues (Hints)** generator to guide users without spoiling the answer.
*   **Question Shuffling**: Randomizes both the order of questions and their answer choices so every attempt is unique.
*   **Admin Modal (View Registered Accounts)**: Access a list of registered users and their bcrypt password hashes directly from the dashboard interface.
*   **Post-Quiz AI Tutor**: Chat with an interactive AI tutor after submitting the quiz to get detailed, short explanations regarding any question or mistake.

---

## 🛠️ Technology Stack

*   **Frontend**: HTML5, Vanilla CSS3 (Custom styling with modern responsive grids), JavaScript (ES6+), jQuery, Bootstrap 5.3 (Forms & Modals), PDF.js (Client-side PDF text extraction).
*   **Backend**: PHP (REST Endpoints & Session handling).
*   **Database**: MySQL / MariaDB (Persistent account records).
*   **AI Integration**: Gemini API via direct HTTPS endpoint.

---

## 🚀 Setup and Installation

### 1. Prerequisite Environments
*   Install and run a local server environment containing PHP and MySQL, such as **XAMPP**.
*   Verify that Apache is running on ports `80`/`443` and MySQL is running on port `3306`.

### 2. Clone the Repository
Clone this repository directly into your local server's webroot directory:
```bash
# E.g. For Windows XAMPP users:
cd C:\xampp\htdocs
git clone https://github.com/VirendraSharma1234/AI-Quiz-Generator.git Final_Project
```

### 3. Configure local credentials
To prevent API Key leaks to GitHub, credentials are separated into a gitignored `config.js` file:
1.  In the project root, copy the template configuration file:
    ```bash
    cp config.template.js config.js
    ```
2.  Open `config.js` in a text editor and replace `"YOUR_GEMINI_API_KEY"` with your actual Google Gemini API Key:
    ```javascript
    const GEMINI_API_KEY = "AIzaSy...";
    ```

### 4. Database Setup (Automatic)
You do **not** need to manually import SQL files. 
*   Open your browser and navigate to: `http://localhost/Final_Project/index.html`
*   The application will automatically connect to your local MySQL server (using default credentials: `host=localhost`, `username=root`, `password=`), create the database `quiz_db`, and instantiate the `users` table automatically.

---

## 🔒 Security Practices

*   **Secrets Isolation**: The Gemini API Key is stored in `config.js`, which is blocked from git commits by `.gitignore`.
*   **Password Protection**: Passwords are never stored in plaintext. They are hashed using bcrypt (`PASSWORD_BCRYPT`) inside PHP before database insertion.
*   **Validation Guardrails**: Double-layer validation (jQuery patterns on the client, regex matches and `filter_var` constraints on the PHP server) protects the backend endpoints.
