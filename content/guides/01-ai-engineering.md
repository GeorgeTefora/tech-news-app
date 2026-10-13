# 01 – AI Engineering

*Curated October 2026. Tiers: Start here → Core → Deep dive. Times are rough.*

## Overview

"AI engineering" means building products **on top of** foundation models (GPT, Claude, Gemini, Llama, DeepSeek and others), as opposed to training them from scratch, which is ML research. The day-to-day work is choosing models, prompting, feeding them the right context (RAG), letting them use tools (agents), measuring quality (evals), and keeping cost and latency under control. These are the topics people currently talk about most in tech, so it's worth learning the vocabulary first.

## Concepts you should be able to explain

  - **Token, context window, temperature**, and why the model is "just" predicting the next token
  - **Transformer / attention**: the intuition, not the math
  - **Pre-training vs. post-training** (instruction tuning, RLHF), and what a **reasoning model** is
  - **Embeddings and vector search**: why "similar meaning → nearby vectors"
  - **RAG**, end to end: chunk → embed → store → retrieve (often hybrid: vector + keyword/BM25) → rerank → stuff into the prompt → generate with citations
  - **RAG vs. fine-tuning vs. long context**: when to use each
  - **Agent** vs. **workflow**, tool/function calling, and **MCP** (Model Context Protocol)
  - **Context engineering**: deciding what goes into the context window and why it matters more than clever prompt wording
  - **Evals**: why "vibes" don't scale; unit-style assertions, LLM-as-judge, human review
  - **Hallucination**, **prompt injection**, and why agents with tool access raise the stakes
  - **Cost/latency levers**: model size, caching, batching, quantization, distillation, open-weight vs. API models

## Reading list

### Start here

  - [**Intro to Large Language Models – Andrej Karpathy (video)**](https://www.youtube.com/watch?v=zjkBMFhNj_g) (1 hr): the best one-hour mental model of what an LLM is. Karpathy also coined "vibe coding".
  - [**The Illustrated Transformer – Jay Alammar**](https://jalammar.github.io/illustrated-transformer/) (45 min): explains attention visually. Read it before the paper.
  - [**What is RAG? – Pinecone Learn**](https://www.pinecone.io/learn/retrieval-augmented-generation/) (20 min): clear walk-through of ingestion → retrieval → augmentation → generation.
  - [**Building Effective Agents – Anthropic**](https://www.anthropic.com/engineering/building-effective-agents) (30 min): the most-cited practical essay on agents. Gives you the vocabulary: prompt chaining, routing, orchestrator-workers, evaluator-optimizer.

### Core

  - [**Attention Is All You Need (2017)**](https://arxiv.org/abs/1706.03762) (1 hr): the Transformer paper. Skim it after Alammar; people quote its title as a meme.
  - [**Retrieval-Augmented Generation for Knowledge-Intensive NLP – Lewis et al., 2020**](https://arxiv.org/abs/2005.11401) (45 min): the original RAG paper, so you know where the term came from.
  - [**Contextual Retrieval – Anthropic**](https://www.anthropic.com/news/contextual-retrieval) (25 min): a concrete, measured improvement on naive RAG (contextual embeddings + BM25 + reranking). Great material for "how would you improve this RAG system?"
  - [**Effective Context Engineering for AI Agents – Anthropic**](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (25 min): why the industry shifted from "prompt engineering" to "context engineering".
  - [**LLM Powered Autonomous Agents – Lilian Weng**](https://lilianweng.github.io/posts/2023-06-23-agent/) (45 min): the classic overview of planning, memory and tool use.
  - [**ReAct: Synergizing Reasoning and Acting (2022)**](https://arxiv.org/abs/2210.03629) (40 min): the paper behind the "think → act → observe" loop that almost every agent uses.
  - [**Model Context Protocol – Introduction**](https://modelcontextprotocol.io/introduction) (20 min): the open standard for connecting models to tools and data, now supported by every major vendor. Often called "USB-C for AI tools".
  - [**Your AI Product Needs Evals – Hamel Husain**](https://hamel.dev/blog/posts/evals/) (30 min): the essay that made evals mainstream. Three levels: assertions → human/model review → A/B tests.
  - [**Prompt injection series – Simon Willison**](https://simonwillison.net/series/prompt-injection/) (1 hr): he coined "prompt injection". Read 3–4 posts, especially the "lethal trifecta" one.

### Deep dive

  - [**The 2025 AI Engineer Reading List – Latent Space**](https://www.latent.space/p/2025-papers): 50 papers across 10 areas (LLMs, evals, prompting, RAG, agents, codegen, vision, voice, diffusion, fine-tuning). Use it as a map and pick from it.
  - ***AI Engineering*** **– Chip Huyen (O'Reilly, 2025)**: the standard textbook for this field, covering evals, RAG, agents, fine-tuning and inference optimization. Check your library or a university O'Reilly subscription.
  - [**Let's build GPT from scratch – Karpathy (video)**](https://www.youtube.com/watch?v=kCc8FmEb1nY): build a tiny GPT in about 2 hours. Turns "magic" into code.
  - [**Patterns for Building LLM-based Systems – Eugene Yan**](https://eugeneyan.com/writing/llm-patterns/): evals, RAG, fine-tuning, caching, guardrails and defensive UX, all in one long post.
  - [**Hugging Face LLM Course**](https://huggingface.co/learn/llm-course): hands-on with open-weight models, tokenizers and fine-tuning.
  - [**OWASP Top 10 for LLM Applications (2025)**](https://genai.owasp.org/llm-top-10/): the security side of AI. Also covered in the Cybersecurity guide.

## Common AI stacks you'll hear about (for stack critiques)

  - **Models:** closed APIs (OpenAI, Anthropic, Google) vs. open-weight models (Llama, Mistral, Qwen, DeepSeek) self-hosted with vLLM or Ollama.
  - **Vector stores:** Pinecone, Weaviate, Qdrant, Chroma, or **pgvector** inside Postgres. That last one is often the "boring", correct answer for small and medium apps.
  - **Frameworks:** LangChain/LangGraph, LlamaIndex, Vercel AI SDK, provider SDKs. A common critique: "you don't need a framework for this, just call the API" (see Anthropic's agents essay).
  - **Evals/observability:** LangSmith, Braintrust, Langfuse, Arize/Phoenix, or a home-grown spreadsheet plus scripts.

## Practice questions (answer out loud)

1.  Explain RAG to a non-engineer in 60 seconds, then to an engineer in 3 minutes, covering chunking, hybrid search and reranking.
2.  A startup fine-tuned a model on its docs and it keeps giving outdated answers. What would you suggest and why?
3.  What's the difference between an agent and a workflow, and why does Anthropic say to start with the simpler one?
