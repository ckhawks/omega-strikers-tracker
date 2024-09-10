# Omega Strikers Tracker
This is a personal project to track my friends and I's match history and statistics for the game Omega Strikers. 

The initial tool was hacked together in an evening.

You can view the project with read-only access at [omegastrikers.stlr.cx](https://omegastrikers.stlr.cx).

## Setting up for development

Clone the repo, and then install the required dependencies:
```bash
git clone https://github.com/ckhawks/omega-strikers-tracker.git
cd omega-strikers-tracker
npm install
```

Copy the `.env.sample` to create the `.env` file:
```bash
DATABASE_URL=""
PGUSER=""
PGPASSWORD=""
SECRET_PASSWORD=""
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the project.

