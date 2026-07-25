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

### Local Setup (XAMPP / local server)
1.  **Prerequisites**: Install and run **XAMPP** (or any server stack with PHP and MySQL). Ensure Apache is running on port `80`/`443` and MySQL on port `3306`.
2.  **Clone**: Clone this repository into your local server's webroot directory (e.g. `C:\xampp\htdocs\Final_Project`).
3.  **Run**: Access the project at `http://localhost/Final_Project/index.html`. The backend will automatically create the database `quiz_db` and the `users` table on first load. No manual SQL imports are needed!

---

## ☁️ Cloud Deployment

This project is fully containerized-ready and environment-aware, making it easy to deploy on modern cloud hosting platforms like **Render**, **Railway**, **Heroku**, or traditional **shared hosting / VPS**.

### Recommended Platforms
1.  **Railway** (e.g., deploying a PHP Web Service + MySQL Database).
2.  **Render** (e.g., deploying a Web Service from this Git repo and linking a free MySQL service).
3.  **InfinityFree / hostinger / GoDaddy** (any cPanel hosting with PHP and MySQL database support).

### Configuration Environment Variables
Set the following environment variables on your cloud hosting dashboard to connect your database and inject secrets securely without committing files:

| Environment Variable | Description | Local default value |
| :--- | :--- | :--- |
| `DB_HOST` | MySQL database host server | `127.0.0.1` |
| `DB_USER` | MySQL database username | `root` |
| `DB_PASS` | MySQL database password | `""` (empty) |
| `DB_NAME` | MySQL database name | `quiz_db` |
| `DB_PORT` | MySQL database port | `3306` |
| `GEMINI_API_KEY` | Your Google Gemini API Key | *(Default public key loaded internally)* |

---

## 🔒 Security Practices

*   **Secrets Isolation**: The Gemini API Key is never hardcoded or exposed in Git commits. It is dynamically served in the frontend via `config_key.php` which reads from system environment variables.
*   **Password Protection**: Passwords are never stored in plaintext. They are hashed using bcrypt (`PASSWORD_BCRYPT`) inside PHP before database insertion.
*   **Validation Guardrails**: Double-layer validation (jQuery patterns on the client, regex matches and `filter_var` constraints on the PHP server) protects the backend endpoints.
