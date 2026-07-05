# Frontend PRD — Declutter Marketplace

> **Status: placeholder.** This document will be written after the backend is functional and we have working API endpoints to build against. Writing UI specs against an unfinished API leads to mock data that never matches reality and refactoring pain when the real API arrives.

## Approach when written

- **Stack:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Deployment:** Vercel or AWS Amplify
- **Web-first, mobile-responsive.** PWA-capable so it can be installed to home screens. Native apps deferred.
- **API integration:** typed client generated from backend OpenAPI/Zod schemas — single source of truth for request/response types
- **State:** React Server Components for reads where possible; TanStack Query for client-side data fetching and mutations; Zustand or React Context for UI state
- **Auth:** Cognito hosted UI or Amplify Auth on the client; JWT attached to API requests via interceptor
- **Real-time:** Web Push for match notifications (service worker); WebSocket connection for in-app messaging
- **Testing:** Vitest for component tests, Playwright for e2e user flows

## What this document will cover

- Route inventory (public pages, authenticated pages, admin)
- Component organisation and design system tokens (from Claude Design output)
- Key user flows with screens: signup, list an item, browse, wishlist, receive match, message, transact, review
- Form handling patterns (React Hook Form + Zod)
- Image upload flow via presigned URLs
- Notification permission flow and service worker registration
- Accessibility baseline (WCAG 2.1 AA)
- Error boundaries and empty states
- Loading and optimistic update patterns
- Build order for Claude Code

## Prerequisites before this document is written

- Backend PRD implemented up to step 12 (transactions module) at minimum
- Backend deployed to staging with a stable API
- Design system exported from Claude Design (colors, typography, components)
- Wireframes for at least the core flows: signup, list, browse, match, message, transact
