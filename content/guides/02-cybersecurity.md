# 02 – Cybersecurity

*Curated October 2026. Tiers: Start here → Core → Deep dive.*

## Overview

Security comes up in almost every tech conversation, whether it's "is this stack secure?", "did you hear about the breach?", or "how do passkeys work?". You don't need to be a pentester to hold your own. You need to understand **how web apps get attacked**, **how identity and authentication work**, **what cryptography does and doesn't guarantee**, and **the handful of famous incidents everyone references**. AI has also opened a new attack surface (prompt injection, poisoned models), and that is where much of the current news is.

## Concepts you should be able to explain

  - **CIA triad** (confidentiality, integrity, availability), **least privilege**, **defense in depth**, **zero trust**
  - **Authentication vs. authorization**; sessions vs. tokens (JWT); **OAuth 2.0 / OpenID Connect** ("Sign in with Google"); **MFA** and **passkeys/WebAuthn**
  - **Injection** (SQL injection, XSS), **broken access control** (IDOR), **CSRF**, **SSRF**
  - **Hashing vs. encryption**, symmetric vs. asymmetric, **TLS/HTTPS**, why you never roll your own crypto, and why passwords get *salted and hashed* (bcrypt/Argon2)
  - **Software supply chain**: dependencies, typosquatting, malicious packages and extensions, SBOMs, signing
  - **Threat modeling**: "what are we building, what can go wrong, what will we do about it?"
  - **Vulnerability vocabulary**: CVE, CVSS, zero-day, exploit, patch, responsible disclosure, bug bounty
  - **Attack types in the news**: ransomware, phishing and social engineering, credential stuffing, DDoS
  - **AI security**: prompt injection, data exfiltration through agents, model and data poisoning, excessive agency

## Reading list

### Start here

  - [**OWASP Top 10:2025**](https://owasp.org/Top10/2025/) (1–2 hr): the standard list of web app risks, released November 2025. The new entries are *Software Supply Chain Failures* (A03) and *Mishandling of Exceptional Conditions* (A10). Read the summary of each category.
  - [**PortSwigger Web Security Academy**](https://portswigger.net/web-security) (ongoing, free): the best hands-on way to learn SQLi, XSS, auth bugs and more, with interactive labs. Do the "Apprentice" labs for 3–4 topics.
  - [**Darknet Diaries (podcast)**](https://darknetdiaries.com/): entertaining true stories of hacks. A painless way to absorb the vocabulary and the famous cases.

### Core

  - [**OAuth 2 Simplified – Aaron Parecki**](https://aaronparecki.com/oauth-2-simplified/) (30 min): the clearest explanation of OAuth flows.
  - [**passkeys.dev**](https://passkeys.dev/) (20 min): what passkeys are and why they replace passwords and resist phishing.
  - [**The Illustrated TLS 1.3 Connection**](https://tls13.xargs.org/) (45 min): every byte of an HTTPS handshake, explained.
  - [**Threat Modeling Manifesto**](https://www.threatmodelingmanifesto.org/) (15 min): the four key questions of threat modeling.
  - [**OWASP Top 10 for LLM Applications (2025)**](https://genai.owasp.org/llm-top-10/) (45 min): prompt injection, sensitive info disclosure, supply chain, data/model poisoning, improper output handling, excessive agency, system prompt leakage, vector/embedding weaknesses, misinformation, unbounded consumption.
  - [**Prompt injection series – Simon Willison**](https://simonwillison.net/series/prompt-injection/): the most readable writing on AI-specific attacks.
  - [**MITRE ATT&CK**](https://attack.mitre.org/) (skim): the shared vocabulary for attacker tactics and techniques that defenders use.

### Famous incidents (people reference these constantly)

  - [**xz Utils backdoor timeline – Russ Cox**](https://research.swtch.com/xz-timeline) (2024): a two-year social-engineering campaign to backdoor a core Linux library, caught by chance when an engineer noticed SSH was 500 ms slower. The textbook open-source supply-chain attack.
  - [**CrowdStrike preliminary post-incident report**](https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/) (July 2024): not a hack. A bad security-software update blue-screened about 8.5 million Windows machines and grounded flights. The lesson is about staged rollouts and canary releases.
  - [**Log4Shell (Wikipedia)**](https://en.wikipedia.org/wiki/Log4Shell) (2021): a one-line string could take over servers through a ubiquitous Java logging library. It is why everyone now cares about dependency inventories (SBOMs).
  - [**SolarWinds / Sunburst (Wikipedia)**](https://en.wikipedia.org/wiki/2020_United_States_federal_government_data_breach) (2020): nation-state attackers poisoned a trusted vendor's software update and breached US agencies.
  - **Recent supply-chain wave (2025–26):** a run of malicious npm packages and compromised developer tools, including the Nx package compromise in 2025 and a malicious version of the Nx Console VS Code extension in 2026 that reportedly led to a GitHub employee device being compromised. The pattern to know: *attackers now target developers' tools, not just production servers.*

### Deep dive and practice

  - [**picoCTF**](https://picoctf.org/): a beginner-friendly capture-the-flag (CTF) competition from CMU, with a permanent practice gym.
  - [**OverTheWire: Bandit**](https://overthewire.org/wargames/bandit/): learn Linux and security basics through a game.
  - [**TryHackMe**](https://tryhackme.com/) / [**Hack The Box**](https://www.hackthebox.com/): guided labs, from beginner to advanced.
  - [**SLSA framework**](https://slsa.dev/): the industry framework for supply-chain integrity.
  - [**Cryptography I – Dan Boneh (Coursera, free to audit)**](https://www.coursera.org/learn/crypto): the classic university crypto course.
  - [**Krebs on Security**](https://krebsonsecurity.com/): investigative journalism on breaches and cybercrime.

## Stack-critique angle

When someone describes their stack, ask:

  - **Auth:** are they hand-rolling it? Usually a managed provider (Auth0/Okta, Clerk, Cognito, Supabase Auth) or a well-vetted library is the better answer.
  - **Secrets:** are secrets in environment variables or code, or in a secrets manager (Vault, AWS Secrets Manager)?
  - **Dependencies:** is there dependency scanning (Dependabot, Snyk), and are versions pinned?
  - **Access:** least-privilege IAM, and MFA or passkeys for admins?
  - **AI features:** can the LLM call tools with real permissions? If so, what stops prompt injection from triggering them?

## Practice questions

1.  Walk through what happens, from a security standpoint, when you click "Sign in with Google".
2.  Why was the xz backdoor scarier than a typical vulnerability?
3.  An AI agent reads a user's email and can send emails. Describe a prompt-injection attack on it and two mitigations.
