# 04 – Frontend, Mobile & Developer Tooling

*Curated October 2026. Tiers: Start here → Core → Deep dive.*

## Overview

Frontend is the part of tech with the most churn and the most memes ("a new JS framework every week"). To speak credibly, know the **core platform** (HTML/CSS/JS and the browser), the **dominant frameworks and why they exist**, the **rendering strategies** everyone argues about, and the **developer tooling** that ties it together: Git, CI/CD, testing, package managers, and now AI coding assistants.

## Concepts you should be able to explain

  - **The DOM**, the event loop, and why JavaScript is single-threaded
  - **SPA vs. MPA**, **CSR vs. SSR vs. SSG vs. ISR**, hydration, and React Server Components (what Next.js popularized)
  - **Why TypeScript won**: static types on top of JS
  - **Component frameworks**: React (dominant), Vue, Svelte, Angular, Solid; meta-frameworks: Next.js, Nuxt, SvelteKit, Remix/React Router, Astro
  - **Build tools**: Vite, esbuild, Turbopack; package managers npm/pnpm/Yarn; runtimes Node, Deno and Bun
  - **Styling**: CSS-in-JS vs. utility-first (Tailwind) vs. plain CSS modules
  - **Mobile**: native (Swift/SwiftUI, Kotlin/Jetpack Compose) vs. cross-platform (React Native/Expo, Flutter)
  - **Git**: branches, merge vs. rebase, pull requests, trunk-based development
  - **CI/CD**: automated tests and deploys (GitHub Actions); feature flags; preview deployments
  - **Testing pyramid / trophy**: unit vs. integration vs. end-to-end (Playwright)
  - **AI coding tools**: autocomplete vs. chat vs. autonomous coding agents, and the "vibe coding" debate

## Reading list

### Start here

  - [**MDN – Learn web development**](https://developer.mozilla.org/en-US/docs/Learn_web_development): the canonical reference for HTML, CSS and JS. Use it as a dictionary.
  - [**React – Quick Start / Learn**](https://react.dev/learn) (2–3 hr): the official docs are excellent. Read "Thinking in React".
  - [**TypeScript Handbook – The Basics**](https://www.typescriptlang.org/docs/handbook/intro.html) (1 hr)
  - [**Pro Git book (free)**](https://git-scm.com/book/en/v2): chapters 1–3 are enough for most conversations.

### Core

  - [**Patterns.dev**](https://www.patterns.dev/): rendering patterns (CSR, SSR, SSG, islands), design patterns and performance patterns, all with diagrams. The best resource for the "why Next.js?" conversation.
  - [**web.dev Learn**](https://web.dev/learn): Google's courses on performance (Core Web Vitals), accessibility and CSS.
  - [**Josh W. Comeau's blog**](https://www.joshwcomeau.com/): the most intuitive CSS and React explanations on the web.
  - [**Continuous Integration – Martin Fowler**](https://martinfowler.com/articles/continuousIntegration.html) (40 min): the definitive essay.
  - [**The Testing Trophy – Kent C. Dodds**](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) (15 min): why integration tests matter.
  - [**State of JavaScript survey**](https://stateofjs.com/) and [**Stack Overflow Developer Survey**](https://survey.stackoverflow.co/): what developers actually use and like. Great for backing up stack opinions with data.

### Deep dive

  - [**ThoughtWorks Technology Radar**](https://www.thoughtworks.com/radar): a twice-yearly "adopt / trial / assess / hold" verdict on hundreds of tools. Very useful for stack critiques.
  - [**Expo / React Native docs**](https://docs.expo.dev/) and [**Flutter docs**](https://docs.flutter.dev/): skim the intros to understand the cross-platform trade-offs.
  - [**Bytes newsletter**](https://bytes.dev/): a funny, twice-weekly JS ecosystem roundup that keeps you current on frontend drama.

## Stack-critique cheat sheet

  - **Marketing or content site built as a React SPA** → poor SEO and performance. Suggest Astro or Next.js static export.
  - **Create React App** → deprecated. Suggest Vite or a meta-framework.
  - **Redux for everything** → often unnecessary now; consider React Query/TanStack Query for server state plus a light store such as Zustand.
  - **Separate native iOS and Android teams** at a small company → consider React Native/Expo or Flutter, unless the app needs heavy native features.
  - **No CI, manual deploys** → GitHub Actions plus preview deploys (Vercel/Netlify) is the cheap, standard fix.

## Practice questions

1.  What is the difference between SSR and CSR, and when would you pick each?
2.  Why did TypeScript largely displace plain JavaScript in professional codebases?
3.  Make the case for, and against, React Native for a startup's first mobile app.
