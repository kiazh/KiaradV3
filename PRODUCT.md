# Product

<!-- impeccable:product-schema 1 -->

<!-- Inferred from the existing site in ../lib/content.ts and ../components. Not confirmed in an interview; edit anything wrong. -->

## Platform

web

## Stack

delegated: Next.js App Router, reusing the parent project's installed `next` and `react`, plain CSS, no new dependencies.

## Users

Recruiters, research supervisors and engineers who land on a personal site to judge whether Kiarad is worth talking to. Secondary: friends and peers browsing interests.

## Product Purpose

Personal site of Kiarad, a Math-Phys student at the University of Waterloo and ML researcher at UofT. It shows what he is working on, what he has built, what he is into, and how to reach him. Success is a visitor opening the resume or a project repo, or sending an email.

## Positioning

Everything is built from scratch to understand how it works: machine learning in C with no libraries, AES-128 in Go off the FIPS spec, a spinning cube in plain C, a decision tree on an ESP32.

## Capabilities and Constraints

- Pages: home (currently / recently), work (5 projects), interests (anime/manga, physics, games, goals).
- Home shows a live raid status from the Destiny API (`/api/destiny` in the parent app) and a Spotify now-playing widget from Lanyard. The redesign keeps both as links or static fallbacks only; the live wiring stays in the parent app.
- Resume is a Google Drive link.
- Undecided: whether the redesign replaces the parent site.

## Brand Commitments

Name: Kiarad. Voice: first person, plain, a little self-deprecating ("Well I can larp and say I hate abstractions..."). Handle `kiazh` on GitHub and LinkedIn. Japanese labels (家 仕事 興味 またね) are part of the current identity but not binding.

## Evidence on Hand

Real projects with GitHub links and years, real interests with notes, real job and status lines. No testimonials, metrics or customers exist and none may be invented.

## Product Principles

1. The work is the proof. Show the projects before describing the person.
2. First person, plain words. No hype, no claims that cannot be checked.
3. One resume link and one email, both findable within seconds.
4. Honest about being a student.
