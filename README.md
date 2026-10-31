# Week Productivity Tracker

> A Next.js dashboard for collecting weekly activity evidence and presenting personal productivity insights.

## What this project does

Week Productivity Tracker organizes weekly work, processes supporting materials, and presents progress through charts and date-based views.

## Architecture

```text
User workspace → Next.js pages/components → activity and document processing → charts and weekly insights
```

## Technology and local run

Next.js, React, Tailwind CSS, Chart.js, Tesseract.js, PDF parsing, and date-fns.

```bash
npm install
npm run dev
```

`app/` contains routes, `components/` UI modules, `data/` project data, and `lib/` supporting logic.
