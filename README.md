# Joyfill Demo

This is a demo project for the Joyfill API. It demonstrates how to use the Joyfill API to generate invoices and patient forms.  

## Prerequisites

- Node.js
- NPM

## Installation

1. Clone the repository:

```bash
git clone https://github.com/vishxly/joyfill.git
```

2. Install dependencies:

```bash
cd joyfill-demo
npm install
```

3. Create a `.env` file in the root directory and add your Joyfill API key and user token:

```bash
# .env
VITE_JOYFILL_API_KEY=sk_Xy9LmT78QpRtYvN4eWzCgHuKTr3a
VITE_JOYFILL_API_KEY_SECRET=sk_Jd8PwL20KvMzNx91RqBcVfLsEiZa


4.
    a. If you don't have a Joyfill account, sign up for a free trial at https://app-joy.joyfill.io/login
    b. If you already have a Joyfill account, create a new API key and user token at https://app-joy.joyfill.io/api_keys
    c. Replace the API key and user token placeholders in the `.env` file with your actual API key and Secret key.

5. Start the development server:

```bash
npm run dev
```

## Usage

Open `http://localhost:3000` in your browser to access the demo application.

## License

This project is licensed under the MIT License.
