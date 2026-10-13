# 03 – Systems, Backend & Cloud

*Curated October 2026. Tiers: Start here → Core → Deep dive.*

## Overview

This is the "how does the internet actually work and how do big apps stay up" layer. It covers networking, databases, caching, queues, distributed systems, cloud infrastructure, containers and observability. Most stack-critique conversations happen here ("why are you on Kubernetes?", "why not just use Postgres?"), and system design is the vocabulary that senior engineers use with each other.

## Concepts you should be able to explain

  - **What happens when you type a URL and press Enter**: DNS → TCP/TLS → HTTP → server → response → rendering
  - **HTTP basics**: methods, status codes, REST vs. GraphQL vs. gRPC, WebSockets
  - **SQL vs. NoSQL**, indexes, transactions/ACID, replication vs. sharding, why "just use Postgres" is popular advice
  - **Caching** (Redis, CDNs), cache invalidation, and why it's "one of the two hard things"
  - **Queues and streams** (SQS, RabbitMQ, Kafka): async processing and decoupling
  - **Scaling**: vertical vs. horizontal, load balancers, stateless services
  - **Distributed systems**: CAP theorem, consistency models, consensus (Raft), idempotency, the "fallacies of distributed computing"
  - **Monolith vs. microservices** vs. serverless
  - **Containers (Docker) vs. VMs**, orchestration (Kubernetes): what each solves and what it costs
  - **Cloud primitives**: compute (EC2/Lambda), storage (S3), managed databases, IAM; the big three (AWS, Azure, GCP) plus "neo-clouds" and GPU clouds
  - **Observability**: logs, metrics, traces, SLOs/SLAs, on-call and postmortems
  - **Latency numbers**: why memory ≪ SSD ≪ network round-trip in cost

## Reading list

### Start here

  - [**What happens when… (GitHub)**](https://github.com/alex/what-happens-when) (45 min): the classic interview question answered in exhaustive detail. Skim it for the shape.
  - [**How DNS Works (comic)**](https://howdns.works/) (15 min): a fun, accurate DNS explainer.
  - [**The Missing Semester of Your CS Education – MIT**](https://missing.csail.mit.edu/): shell, Git, debugging and tooling that classes skip.
  - [**ByteByteGo blog**](https://blog.bytebytego.com/): system design concepts with great diagrams. Skim a few free posts per week.

### Core

  - [**System Design Primer (GitHub)**](https://github.com/donnemartin/system-design-primer) (many hours): the most popular free guide to large-scale system design, with worked examples.
  - [**Use The Index, Luke**](https://use-the-index-luke.com/): how database indexes actually work and why queries are slow.
  - [**Latency Numbers Every Programmer Should Know**](https://gist.github.com/jboner/2841832) (5 min): a famous gist.
  - [**The Secret Lives of Data: Raft**](https://thesecretlivesofdata.com/raft/) (15 min): an animated explanation of distributed consensus.
  - [**Fallacies of Distributed Computing (Wikipedia)**](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) (10 min): "the network is reliable", "latency is zero" and the rest.
  - [**The Twelve-Factor App**](https://12factor.net/) (30 min): principles for cloud-native apps that still shape how people talk.
  - [**Docker overview**](https://docs.docker.com/get-started/docker-overview/) and [**Kubernetes overview**](https://kubernetes.io/docs/concepts/overview/) (30 min each): read the official "what and why" pages.
  - [**Wizard Zines – Julia Evans**](https://wizardzines.com/) and [**her blog**](https://jvns.ca/): friendly deep-dives on networking, Linux, Git and debugging.

### Deep dive

  - ***Designing Data-Intensive Applications*** **– Martin Kleppmann (**[**book site**](https://dataintensive.net/)**)**: *the* book for backend and data systems. A 2nd edition has been in progress; read whichever you can get.
  - [**Google SRE Book (free online)**](https://sre.google/sre-book/table-of-contents/): where SLOs, error budgets and blameless postmortems come from.
  - [**Amazon Builders' Library**](https://aws.amazon.com/builders-library/): how AWS engineers handle timeouts, retries, load shedding and caching.
  - [**High Performance Browser Networking – Ilya Grigorik (free)**](https://hpbn.co/): TCP, TLS, HTTP/2 and WebSockets explained properly.
  - [**Jepsen**](https://jepsen.io/): analyses showing which databases lose data under partition. Famous for embarrassing database vendors.

## Stack-critique cheat sheet

  - **"We use Kubernetes"** for a 3-person startup → often overkill. Alternatives: a PaaS such as Render, Fly.io, Railway or Heroku, plus AWS ECS/Fargate or Cloud Run.
  - **"We use MongoDB because it's flexible"** → ask whether the data is actually relational. Postgres with JSONB covers most "flexible" needs.
  - **"We have 20 microservices"** with a small team → a distributed monolith; consider a modular monolith.
  - **"We self-host everything"** → what's the ops burden? Managed databases are usually worth it early on.
  - **"We're all serverless"** → watch for cold starts, vendor lock-in, and costs at steady high load.
  - **Popular "boring" defaults in 2026:** Postgres (+ pgvector), Redis or Valkey, S3-compatible object storage, a managed container platform, OpenTelemetry for observability.

## Practice questions

1.  Design a URL shortener. Where are the bottlenecks at 1,000 vs. 1 billion requests per day?
2.  Explain the CAP theorem with a real example and say when you'd choose availability over consistency.
3.  A team says "our site is slow". List the first five things you'd check, in order.
