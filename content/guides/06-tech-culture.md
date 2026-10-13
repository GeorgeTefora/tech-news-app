# 06 – Tech Culture, Companies & Inside Jokes

*Curated October 2026. Use this as a glossary to look things up, not something to read cover to cover.*

## Overview

A lot of tech conversation runs on shared references: memes, famous failures, company stereotypes and "laws". Most come from a few places: Hacker News, r/ProgrammerHumor, xkcd, HBO's *Silicon Valley*, and famous incidents. Below are the ones you're most likely to hear, grouped by theme, with the context behind each joke.

## Where the jokes come from

  - [**xkcd**](https://xkcd.com/) plus [**explain xkcd**](https://www.explainxkcd.com/): the most-quoted comic in tech. If someone says "there's an xkcd for that", look it up on explain xkcd.
  - [**r/ProgrammerHumor**](https://www.reddit.com/r/ProgrammerHumor/): meme central.
  - [**Hacker News**](https://news.ycombinator.com/): the tech-industry forum. Its comment culture is itself a meme (contrarian, "well, actually").
  - ***Silicon Valley*** **(HBO, 2014–2019)**: a satire of startup culture that many engineers quote ("Pied Piper", "middle-out", "tabs vs. spaces", "Hooli", "making the world a better place").
  - [**The Jargon File**](http://www.catb.org/jargon/html/): the old-school hacker dictionary, for historical slang.

## Engineering jokes and sayings

  - **"It's always DNS."** The haiku: *"It's not DNS / There's no way it's DNS / It was DNS."* Mysterious outages very often turn out to be DNS misconfigurations.
  - **"There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors."** A joke on Phil Karlton's quote; the third item is the off-by-one error.
  - **"Works on my machine."** A bug that only reproduces elsewhere. It is part of why Docker exists (you "ship your machine").
  - **"How do I exit Vim?"** [One of the most-viewed Stack Overflow questions ever](https://stackoverflow.com/questions/11828270/how-do-i-exit-vim). The joke is that people get trapped in Vim. (Answer: :q)
  - **Tabs vs. spaces / Vim vs. Emacs**: eternal, pointless holy wars, parodied in *Silicon Valley*.
  - **Bikeshedding** ([Law of triviality](https://en.wikipedia.org/wiki/Law_of_triviality)): spending hours debating trivial details (the color of the bike shed) while ignoring the hard parts.
  - **Yak shaving**: a chain of side tasks you must finish before you can do the real task.
  - **Rubber duck debugging**: explaining your code to a rubber duck until you spot the bug.
  - **"Don't deploy on Friday."** Because you'll be fixing it all weekend.
  - **LGTM ("looks good to me")**: rubber-stamp code review, often on a 2,000-line pull request nobody read.
  - [**xkcd 2347 "Dependency"**](https://xkcd.com/2347/): all of modern infrastructure resting on one project "some random person in Nebraska has been thanklessly maintaining since 2003". Referenced after every supply-chain incident (left-pad, Log4Shell, xz).
  - [**left-pad (2016)**](https://en.wikipedia.org/wiki/Npm_left-pad_incident): one developer unpublished an 11-line npm package and broke thousands of builds. The origin of jokes about JS's tiny-dependency culture.
  - **"Rewrite it in Rust" (RIIR)**: Rust fans' reputation for suggesting every project be rewritten in Rust. The "Rust Evangelism Strike Force" is the same joke.
  - **JavaScript fatigue / "a new JS framework every week"**: frontend churn. Also "\[\] + {}" and other JS weirdness, and "node\_modules is the heaviest object in the universe".
  - **"Kubernetes for a to-do app" / résumé-driven development**: overengineering to pad a CV.
  - **"MongoDB is web scale"**: a 2010 animated video mocking NoSQL hype. "Web scale" is now sarcastic.
  - **"10x engineer"**: the myth of the super-productive developer, used sincerely and mockingly.
  - **"The cloud is just someone else's computer."**
  - **Conway's law**: "organizations design systems that mirror their communication structure."
  - **Brooks's law /** ***The Mythical Man-Month***: "adding people to a late project makes it later."
  - **Hofstadter's law**: "it always takes longer than you expect, even when you take Hofstadter's law into account."

## AI-era slang (2023–2026)

  - **"Vibe coding"**: coined by Andrej Karpathy in February 2025 for letting AI write code you don't read. Collins Dictionary's word of the year for 2025. The counter-meme is **"vibe debugging"**: fixing the mess afterwards.
  - **"Slop" / "AI slop"**: low-quality AI-generated content flooding the internet.
  - **"GPT wrapper" / "thin wrapper"**: dismissive term for a startup that just puts a UI on someone else's model.
  - **"Just one more scaling law" / "AGI by next year"**: jokes about AI hype and recurring timeline predictions.
  - **Counting the r's in "strawberry"**: the classic example of an LLM failing a trivial task (because of tokenization).
  - **"Stochastic parrots"**: from a [2021 paper](https://dl.acm.org/doi/10.1145/3442188.3445922) arguing LLMs only mimic language. Still the shorthand in "do LLMs understand?" arguments.
  - **"Hallucination"**: an LLM confidently making things up.
  - **"Context window anxiety", "prompt engineer is not a real job", "the AI will replace us"**: recurring workplace jokes.
  - **"GPU-poor" vs. "GPU-rich"**: who can afford huge compute. Jensen Huang's **leather jacket** is Nvidia's mascot-level meme.
  - **The OpenAI board saga (November 2023)**: Sam Altman was fired and rehired within about five days. "What did Ilya see?" became a meme.
  - **"DeepSeek moment" (January 2025)**: a Chinese lab released a cheap, strong open model and Nvidia's market value briefly dropped by hundreds of billions. Now shorthand for any surprise efficiency breakthrough.

## Company stereotypes and running jokes

  - **Google kills products**: see [**Killed by Google**](https://killedbygoogle.com/) (300+ shut-down products). The running joke is "don't get attached to a Google product".
  - **Microsoft**: "Embrace, Extend, Extinguish" ([EEE](https://en.wikipedia.org/wiki/Embrace,_extend,_and_extinguish)), its 1990s anti-competitive strategy. Also Clippy nostalgia, Teams complaints, "Microsoft ❤️ Linux" irony, and the OpenAI partnership.
  - **Apple**: "Sherlocked" (Apple builds your app's feature into the OS and kills your startup), the "walled garden", and "courage" (removing the headphone jack).
  - **Meta**: "move fast and break things" (the old Facebook motto), the $40B+ metaverse pivot jokes, "year of efficiency", and the AI talent-poaching offers.
  - **Amazon**: "Day 1" culture, the two-pizza team, "six-pager" memos, and the burnout reputation. **AWS outage** jokes: when us-east-1 goes down, half the internet goes with it.
  - **IBM**: "Nobody ever got fired for buying IBM", the symbol of safe, boring enterprise purchases.
  - **Yahoo**: the "it could have bought Google and Facebook" cautionary tale. See also Blockbuster passing on Netflix.
  - **Twitter/X**: the 2022 Musk acquisition, mass layoffs, "hardcore" emails and the rebrand. A frequent example in "how many engineers do you really need?" debates.
  - **Oracle**: aggressive licensing and auditing jokes ("Oracle has more lawyers than engineers").
  - **Nvidia**: "the shovel seller in a gold rush", now one of the world's most valuable companies.
  - **"Year of the Linux desktop"**: predicted every year since the late 1990s.
  - **"Enshittification"** ([Cory Doctorow](https://en.wikipedia.org/wiki/Enshittification)): platforms get worse once they've locked in users and start squeezing them for profit.
  - **FAANG / MAANG / Magnificent Seven**: shorthand for Big Tech (Meta, Apple, Amazon, Netflix, Google; the Mag 7 adds Microsoft, Nvidia and Tesla).
  - **ZIRP**: the "zero interest rate phenomenon". Many 2010s–2021 startup excesses, and the 2022–24 layoffs, are blamed on the end of cheap money.
  - **Gartner Hype Cycle**: Peak of Inflated Expectations → Trough of Disillusionment. Used for blockchain, the metaverse and now AI.

## Learn the history (makes the jokes land)

  - [**Acquired (podcast)**](https://www.acquired.fm/): multi-hour histories of Nvidia, Microsoft, Google, Meta, TSMC and more. Arguably the best way to learn company lore.
  - ***Chip War*** **– Chris Miller**: why semiconductors (TSMC, Nvidia, export controls) dominate tech geopolitics.
  - ***The Idea Factory*** **– Jon Gertner**: Bell Labs, which invented the transistor, Unix, C and information theory.
  - ***Hackers*** **– Steven Levy**: the original hacker culture.
  - [**Stratechery – Ben Thompson**](https://stratechery.com/): business strategy of tech companies ("Aggregation Theory").

## People you should be able to place

Sam Altman (OpenAI), Dario Amodei (Anthropic), Demis Hassabis (Google DeepMind), Jensen Huang (Nvidia), Satya Nadella (Microsoft), Sundar Pichai (Google), Mark Zuckerberg (Meta), Tim Cook (Apple), Andy Jassy (Amazon), Elon Musk (Tesla/SpaceX/X/xAI), Lisa Su (AMD), Andrej Karpathy (AI educator, ex-OpenAI/Tesla), Yann LeCun (AI researcher, AGI-hype skeptic), Geoffrey Hinton (deep learning pioneer, Nobel 2024), Linus Torvalds (Linux and Git), Paul Graham (Y Combinator; essays), DHH (Ruby on Rails, the 37signals cloud exit, a frequent contrarian).

## Practice

1.  Explain "it's always DNS" and *why* it's true.
2.  Someone says "that startup is just a GPT wrapper". What do they mean, and what's a good counterargument?
3.  Why do people joke about Google killing products, and what effect does that have on adoption of new Google products?
