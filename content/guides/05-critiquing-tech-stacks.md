# 05 – Evaluating & Critiquing Tech Stacks

*Curated October 2026.*

## Overview

Critiquing a stack well isn't about naming the trendiest tool. It's about asking **what problem they're solving, at what scale, with what team**, and then spotting mismatches. The best critiques sound like "given X, I'd consider Y because Z, but the trade-off is W." This guide gives you a framework, the classic essays everyone cites, and real case studies to reference.

## A 7-question framework for any stack

1.  **Problem and requirements:** what does the product need (real-time? heavy reads? ML? offline?).
2.  **Scale (now and in 12–24 months):** users, data volume, traffic spikes. Avoid designing for Google-scale on day one.
3.  **Team:** size, existing skills, and hiring market. A familiar tool usually beats a "better" unfamiliar one.
4.  **Operational burden:** who runs it at 3 a.m.? Managed vs. self-hosted.
5.  **Cost:** cloud bills, licenses, and engineer time (usually the biggest cost).
6.  **Lock-in and portability:** how hard is it to leave this vendor?
7.  **Ecosystem and maturity:** docs, community, longevity. Is it "boring" (good) or bleeding-edge (an innovation token)?

**Phrasing tip:** lead with a question ("what's driving the choice of X?") before suggesting an alternative. It sounds informed, not arrogant.

## Essential essays

### Start here

  - [**Choose Boring Technology – Dan McKinley**](https://boringtechnology.club/) (20 min): the most-cited essay on stack choices. Introduces "innovation tokens": you only get about three, so spend them carefully. ([Original essay](https://mcfunley.com/choose-boring-technology))
  - [**You Are Not Google – Ozan Onay**](https://blog.bradfieldcs.com/you-are-not-google-84912cf44afb) (15 min): stop copying Big Tech architectures you don't need.
  - [**Monolith First – Martin Fowler**](https://martinfowler.com/bliki/MonolithFirst.html) (10 min): start with a monolith and split later if you must.
  - [**Microservice Prerequisites – Martin Fowler**](https://martinfowler.com/bliki/MicroservicePrerequisites.html) (10 min): what you need in place before microservices make sense.

### Case studies people reference

  - **Amazon Prime Video moves a service from microservices back to a monolith (2023)**: they cut costs by 90% by consolidating serverless and microservice components. [Archived original post](https://web.archive.org/web/2023/https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90). It became a meme in the "microservices are overrated" debate.
  - [**Goodbye Microservices – Segment**](https://segment.com/blog/goodbye-microservices/): another well-known "we went back to a monolith" story.
  - [**37signals / Basecamp cloud exit**](https://basecamp.com/cloud-exit): left AWS for their own hardware and expect to save about $10M over five years. Cited in every "cloud is expensive" argument. The counterpoint is that it works when you have steady load and ops expertise.
  - [**Stack Overflow's architecture – Nick Craver**](https://nickcraver.com/blog/2016/02/17/stack-overflow-the-architecture-2016-edition/): a top-50 website ran on a handful of servers and a monolith. The classic "you don't need that much infrastructure" example.
  - [**How Discord stores trillions of messages**](https://discord.com/blog/how-discord-stores-trillions-of-messages): when you *do* need a specialized database (they moved from Cassandra to ScyllaDB).
  - [**How Figma's databases team lived to tell the scale**](https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/): scaling Postgres very far before reaching for anything exotic.

### Tools for forming opinions

  - [**ThoughtWorks Technology Radar**](https://www.thoughtworks.com/radar): adopt / trial / assess / hold ratings.
  - [**Stack Overflow Developer Survey**](https://survey.stackoverflow.co/): popularity and "most admired" tools.
  - [**StackShare**](https://stackshare.io/): see what stacks real companies use.
  - [**The Pragmatic Engineer**](https://newsletter.pragmaticengineer.com/): frequent deep dives on how specific companies build things.

## Common stacks and tailored alternatives

  - **Early-stage SaaS web app.** Typical 2026 default: Next.js + TypeScript + Postgres (often via Supabase or Neon) + Vercel + Stripe + a managed auth provider. Critique: great for speed, but watch Vercel costs at scale and the coupling to Next.js. Alternatives: Rails or Django ("one-person framework" productivity), Remix/React Router, or a simple VPS.
  - **AI app / RAG product.** Typical: Python FastAPI + LangChain + Pinecone + OpenAI. Critique: frameworks add abstraction you may not need, and a separate vector DB may be unnecessary. Alternatives: provider SDKs directly, pgvector in an existing Postgres, multiple model providers for cost and redundancy, and an eval setup from day one.
  - **Enterprise backend.** Typical: Java/Spring or .NET on Kubernetes with Kafka. Often appropriate at large scale. Critique only if the team is small or the traffic is low.
  - **Data/analytics.** Typical: Snowflake or Databricks + dbt + Airflow. Alternatives for smaller scale: Postgres or DuckDB plus dbt; BigQuery for serverless analytics.
  - **Mobile.** Native for performance-critical or hardware-heavy apps; React Native/Expo or Flutter for most startups.
  - **Infrastructure.** For small teams, a PaaS (Render, Fly.io, Railway, Cloud Run) usually beats Kubernetes. Kubernetes earns its keep with many services, a platform team, or multi-cloud needs.

## Red flags to listen for

  - Résumé-driven development: picking a tool because it's trendy, not because it fits.
  - More services than engineers.
  - Building in-house what is a commodity (auth, payments, email delivery).
  - No observability or tests, combined with a complex distributed architecture.
  - "We'll need to scale to millions": do they have thousands yet?

## Practice questions

1.  A five-person startup uses microservices on Kubernetes with Kafka for an internal tool with 200 users. Give a respectful critique and a replacement stack.
2.  When is leaving the cloud (as 37signals did) a good idea, and when is it a bad one?
3.  Defend MongoDB for a use case where it's genuinely the right choice.
