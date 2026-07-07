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

### Required Secrets

Add these secrets to your GitHub repository:

- `VERCEL_TOKEN` — [Vercel account token](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — From `.vercel/project.json` after linking
- `VERCEL_PROJECT_ID` — From `.vercel/project.json` after linking

### Manual Deploy

```bash
npx vercel
```

## Tech Stack

- [Next.js 15](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vercel](https://vercel.com/) for hosting
