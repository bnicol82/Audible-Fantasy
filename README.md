# Audible Fantasy

A fantasy audiobook browsing UI built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Featured hero section with book spotlight
- Searchable catalog with genre filters
- Responsive grid layout
- Dark fantasy-themed design

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

The project includes GitHub Actions workflows for CI and Vercel deployment.

### GitHub Pages (recommended — no secrets required)

1. Go to **Settings → Pages** in your repo
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. Re-run the **Deploy to GitHub Pages** workflow (or push to `main`)
4. Your site will be live at **https://bnicol82.github.io/Audible-Fantasy/**

### Vercel (optional — preview URLs per PR)

1. Create a project at [vercel.com](https://vercel.com) linked to this repo
2. Add these GitHub repository secrets:
   - `VERCEL_TOKEN` — [account token](https://vercel.com/account/tokens)
   - `VERCEL_ORG_ID` — from `.vercel/project.json` after linking
   - `VERCEL_PROJECT_ID` — from `.vercel/project.json` after linking
3. Add repository variable `VERCEL_DEPLOY_ENABLED` = `true`
4. Deployments run automatically on push/PR

## Tech Stack

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vercel](https://vercel.com/) for hosting
