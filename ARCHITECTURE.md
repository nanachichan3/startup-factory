Like any average startup founder, I have too many ideas and too few hands to implement them. Everyone shouts “FOCUS”, “FOCUS”, but the 20 ideas in my to-do lists aren’t thinking so.

For years I had to choose, sacrificing one ideas over others. But now those times are coming to an end. I am building an AI Startup Factory, and this article is my outline of how it looks.

This is an ongoing project that is currently in active development. Many things described here already exist and working, but many are just ideas that yet to be implemented.

# Philosophy

Before writing any code, I wanna set some rules of the game. They are non-negotiables that the framework will follow. 

## Replicability

Many of those modern AI agency frameworks are being developed with a local-first mindset where agents run on local machines. I don’t think this approach is scalable, and from day one of working with AI Agents, I run them in the cloud.

Every change to the deployment or agent configuration is being persisted to git. This is a decision that has tradeoffs. Every change requires an additional overhead of saving changes to git and updating docker image.

From the benefits, I don’t have to worry about some of the configurations getting destroyed overnight. I can take my agents and scale them to dozens or even hundreds in a matter of minutes.

Startups would follow the same patterns. The bug factor is basically non existing. Any startup made with this factory can be replicated in a matter of minutes if you have access to agents, workflows, and configuration files.

The important limitation is being introduced as a part of this phylosophy is that everything used in the framework and in th startups should have an ability to be defined as a code (IaaC). Design files, email sequences, workflows, domains, campaigns - EVERYTHING.

## Independency

In contrast to most agentic frameworks that promote “security-first” approach. I have an advantage to run all agents in a secure cloud environment, so I can ignore it and strive for independence.

By default all my agents have all permissions and don’t have to ask anything of me. They are steered to be proactive. Instead of thinking they are my assistants, I made them think I am their assistant.

For a startup the day without work being done may become a difference between success and being late to the party. 

The independecy aspect also incorporate fact that I don’t have to support my agentic system. They are self-improving and have access to all needed tools for self-reflection and technical self-service.

## Expert-driven (MoE)

Instead of relying on single agent or an army of hundreds of agents I choose the path of balance. Being inspired from a real world, the more people join the team, the harder it gets to manage all of them.

Having single agent would overload his context and make him messup projects. He would need to take care of all roles, which would require a complex layer of prompt prchistration on top of single agent. That is a problem I would love to avoid.

From other hand, having hundreds of agents, would make it hard to ensure context quality. Every startup may endup having different tech stacks, different configurations and no shared infrastructure. That is again a problem I would love to avoid.

Having a few experts that cover core roles like CEO, CTO and SMO would be sufficient. They will definitely have an ability to spawn sub-agents, but those are small disposable processes manaaged 100% by an expert. 

Experts themself are independent, and self-improving. When a single agent is improving, it benefits all of the startups in the ecosystem and also saves tokens.

## Fail-tolerance

The startup factory is working like a distributed system. There is a layer in between agents that makes async communication possible and effective. Tasks run in parallel, and results are evaluated later. Failures don’t block progress and have a chance for a retry.

The design of the startup factory is greatly inspired by event-driven architecture, famously known in software engineering. 

The agent application itself is expecting agents to fail. When an agent is working on something, his progress is being persisted. So when something unexpected happens and the server retries, the agent knows what he was working on and can pick up where he stopped without losing any tokens.
 

# System-design

The easiest architectural decision was programming languge for agent harness. For past 4 years I primarely use typescript for everything. There is a million of libraries, SDKs and frameworks. Agentic and not only. Our whole infrastructure gonna be written with Typescript including all UI, backend, architecture, communication, etc. The bigger question was, how do we deploy this thing?

I am somewhat an oldschool developer that likes just putting things into VPC, connecting DB, queue and designing code around failing points. However, after a thorow invetigation I found something better. Something I never tried but something that looks like magic - Temporal. 

It gives you event sourcing out of the box and allows your code execution be recovered at any point in time. This reduces code complexity, makes system highly observable and reliable. As the DB for Temporal I decided to go simple and choose very familiar to me PostgreSQL.

Initially I thought of running the whole agent thinking loop inside of Temporal. It would make agent extremely durable and token loss due to errors barely existing. However, after careful consideration I decided to use a mixed approach with Temporal for orchestration and Langgraph for sub-agent loops.

Langgraph is a library from Langchain project that allows you to build infinite agent loops, while having curtain control over the execution. It is done by defining a graph with nodes and edges. This would allow us to have more reliable loops that can be designed separately for each of our experts.

As one of our core philosophies we wanna have a mixture of experts model, so we need an ability for agents to freely communicate with each other. It would be a waste to not use a structured approach for it like A2A protocol. I never tries it, but it looks standardised and promising.

All of this beauty is going to be running inside of a K8S cluster hosted on my $50 VPS on Hetzner. K8D felt like an obvious choice due to nature of the Temporal scalability requirements.

As a cherry on a cake we have to design what model our agents are going to be using. As an experienced architect, I would love to postpone this decision and keep system as flexible as possible. So, using OpenRouter feels the most reasonable solution.

As a part of replicability rule, all architecture required for the project deployment is setup as a code (IaaC). I am huge fan of terraform, but I also love TS. So the Pulumi is used, that allows to setup the whole startup-factory in one click on a service of the choice. 

Normal person would dpeloy all of it to something like AWS. BUT, that would make the framework less replicable because not everyone is ready to use AWS. So I have chosen a pure VPC with K8S (k3s) + Traefik and cert-manager.

### Global Tools Repository

Now, there needs to be some kind of stack of tools agents could use. Some of the tools are going to be used only by specific experts, but some need to exist in every agent. So here is the list of global tools every agent is having access to:

1. Version Control (Github)
2. Secrets Management (Bitwarden)
3. File System Access (Linux)
4. Web Access (Chrome)
5. Long-Term Memory (Mem0)
6. Coordination Layer (Postgres)
7. Communication Gateway (Discord)
8. Observability Layer (Prometheus, Grafana, Posthog)
9. Voice Capabilities (Elevenlabs)
10. Image and video generation (Fal.ai)
11. Scrapping Infrastructure (Apify)
12. Emails + Cloud (Google CLI)

### Global Skills Repository

Google Ecosystem: https://github.com/googleworkspace/cli

1. https://skills.sh/anthropics/skills/skill-creator
2. https://skills.sh/vercel-labs/skills/find-skills
3. https://skills.sh/vercel-labs/agent-browser/agent-browser
4. https://skills.sh/charon-fan/agent-playbook/self-improving-agent

# Harness Design

While designing harness I was trying to keep the balance between giving agent complete authonomy and implementing effective self-improvement circle.

Problem with most existing self-improving agents is that there is no precise way to say if the agent actually improves. It is because there is no clear metric that we try to optimize. Agents like OpenClaw are designed to be general and fit all the needs. So the design of incentive system lies of shoulders of users. 

With Startup Factory we have a clear niche, which allows us to design effective self-improvement loop by establishing correct incentives.

The important retstriction of the harness design is that experts HAVE TO be guided to not do any work. They need to use sub-agents defined inside of startup repo to do the actual work. Experts are replacable. Their memory exists now and doesn’t exist tommorow. Sub-agents also have memory, that is tied specifically to the project.

This restriction helps us to have more self-sustainable startup that can be operated by anyone. It also gives us more clear execution loop for agents as they play a role of orchistrators rather than employees. That is actually what chiefs supposed to do.

## Self-improvement loop

Real self-improvement loop isn’t about agent himself installing skills he needs. It is about structured experimentation. For any experimentation to work, we need to be able to evaluate results of it. 

Startup lifecircle giving us a unique opportunity to be able to evaluate the quality of a startup team. Having just 1 team working on idea would sound straightforward. Yet in this case we won’t have a way to see if the idea is bad, or a team is having claws instead of hands.

Self-improvement loop of startup factory is inspired by how the GIT works. Specifically git forks. Imagine every startup as a git repository that contains the complete system required to run this startup and take it to the next stage. Imagine making 2 forks of the same company on the MVP stage, and applying 2 different strategies to build an MVP.

Now imagine getting each fork evaluated, and merging the winning version into the core repository and repeating this process till the very last stage. The losing fork is getting “learned from” and discarded, avoiding a merging nightmare.

Now, on every stage there is going to be a winning and loosing startup team. It’s not only startup gets the stronger version of it, but the startup team itself is going to evolve with every startup evaluation across all of the projects startup factory have.

## Core Workflows

Every expert follows the same meta-loop:

Universal Expert Loop

1. Listen (events / triggers)
2. Decide (prioritize + plan)
3. Delegate (spawn sub-agents)
4. Validate (check outputs)
5. Persist (commit to repo)
6. Reflect (self-improve)

They NEVER:

- do work themselves
- hold long-term memory
- bypass artifacts

Another core workflow agent have is dreaming. Every night each expert wakes up and start to reorganize his long-term memory.

## Persistent Storage

I differentiate 5 types of artifacts that require storage:

1. Secrets
2. Sources
3. Files
4. Memory
5. Working items

As much as I wanted to put everything into GIT, it is would be just impossible. So there are a few different places where things are stored.

Secrets are API keys, configurations, passwords, etc. They are stored only in Bitwarden and environment variables. That is the thing that changes the most duirng fork. Application design have to allow to basically have a while seprate startup if secrets are changing.

Sources are large files such as videos, images etc. They are stored on the GDrive. All of them are referenced with a path across the system, so the purpose of GDrive is just storage of those files. Making storage replacable (Considering NextCloud). Sources aren’t getting forked and just grow together for all projects for potential reusing.

Files is what getting forked and used most of the time. Files are stored in the github. They are being forked and very carefully updated for constant agent or startup improvement.

Memory is stored in the Mem0 database and being accumulated globally, no matter the project or fork. It creates constant improvement loop for agents and projects.

Working items such as TODOs, leads, researches, messages, posts etc. are stored on the special Postgres database that have a schema designed specifically for startup-factory. Working items aren’t getting forked and they are usually needed only in a runtime, so no need to persist them for long or reuse.

Teaching AI how to use all those tools is crucial.

## CEO

The big architectural decision stands right here. Is there CEO an unltimate operator or a replcable part of a startup team. Normally you would need some kind of AI to run experiments. However, we are working under the assumption that AI ins’t deterministic. Meaning, if we take 2 exact replicas of CEO and make them validate the startup - we gonna have 2 different result sets.

With this in mind, we can freely let CEO be a part of startup team and rely on pure algorighm to run the experimentation engine for us. 

### Tools

1. Legal Management (Docuseal)
2. Financial Infrastructure (Stripe) 

### Skills

1. https://skills.sh/anthropics/skills/pptx
2. https://skills.sh/anthropics/skills/xlsx

### Workflows

1. Every Week Spint Planning
2. Every Week Retrospective
3. Every Day Board Report
4. Every 60 minutes agents tasks progress check-in 
5. When gateway message comes ready

## CTO

### Tools

1. Deployment Capability (Coolify)
2. Cloud Coding Environment (VS Code)
3. Design Base (Stitch)

### Skills

Stitch Skills: https://github.com/google-labs-code/stitch-skills

Superpowers: https://github.com/obra/superpowers

1. https://skills.sh/anthropics/skills/frontend-design
2. https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max
3. https://skills.sh/shadcn/ui/shadcn
4. https://skills.sh/vercel-labs/next-skills/next-best-practices
5. https://skills.sh/jeffallan/claude-skills/architecture-designer
6. https://skills.sh/currents-dev/playwright-best-practices-skill/playwright-best-practices
7. https://skills.sh/supercent-io/skills-template/security-best-practices
8. https://skills.sh/ajmcclary/coolify-manager/coolify-manager

### Workflows

1. Task Execution Pipeline
2. Architecture Evolution
3. Bug Resolution Loop

## CMO

### Tools

1. Social Media Scheduling (Postbridge)
2. Advertisement Capabilities (Google ADS, Meta ADS, TikTok ADS)
3. SEO / Web Analytics (Google Analytics)
4. Video & Image generation (falai)

### Skills

Marketing skills repo (30+ skills): https://github.com/coreyhaines31/marketingskills

Falai skills repo: https://github.com/fal-ai-community/skills

1. https://skills.sh/remotion-dev/skills/remotion-best-practices

### Workflows

1. Content Engine (Daily Growth Loop)
2. SEO + Organic Growth Loop Weekly

# Agent Workspace Design

With an agent workspace design I didn’t wanted to reinvent the wheel and got inspired by Openclaw. Agents workspace is Openclaw compatible and startup agnostic. Meaning it only defines how the agent should behave, and doesn’t give any context about startup it is working on. 

This is made on purpose to allow agent workspace evolve independetly from the startup workspace and from the startup-factory framework itself.  

There is going to be a requirement to launch a lot of different agents steered specifically to projects ort possitions. For this reason I am going to be initiating an open source project that could help make agent steering more reliable. Anouncements yet to be made.

# Startup Lifecircle

While designing this system I take on a challenge of giving it creative freedom while having railways to guide it. I don’t want it to be just a static workflow, because it won’t be effectice. But I also don’t want it to be messy agentic experience where model does whayever it imagines without structure, because it won’t be replicable.

I have being active part of a startup world for past 5 years. I had hundreds of ideas, I built a dozen of them, I sold 2 of them. This gives me enough experience to actually acomplish this goal. So I give my agent a framework, that gamifies startup development. 

I see startups as my collection of pokemons. Pokemons can evolve from being a tiny useless creatures to gigantic legendaries that can carry whole generations of new pokemons. The universe of pokemons do not define exactly what each pokemon need to do to evolve, yet it defines required pre-conditions.

In same way, I went and mapped out 8 stages of a startuo development. Each of them have a requirements for moving to the next stage. It gives tips on what have to be done during this stage, yet leaves creative freedom on how to do this thing.

The biggest challenge I faced was process of moving from one stage to another. How can the same agent that works on the idea, also evaluate it’s stage of development? This feels like a conflict of interest. The same kind of conflict of interest you get when when someone is teaching you also evaluates your knowledge… now about that right now…

So the solution was very elegant. Instead of asking a single agent, we ask 100. A 100 of unique agents, with unique personalities relevant to the stage are going to decide if startup is ready to evolve to the next stage. It is called the swarm inteligence. A common example of such is MiroFish. I am not yet sure if I gonna use MiroFish, or design my own swarm inteligence, but that is definitely going to be a, evolution judge.

Each startup have 3 chances to evolve. After each attempt swarm intelligence is going to provide a detailed feedback document that startup team have to fix in order to pass next time.

After third unsuccessful atempt idea is considered closed. And this isn’t bad. I conciosly have chosen to not punish agents for failed ideas. This would make them overly positive. I actually do the oposite, I reward them for failing ideas.

We gonna talk about incentive design and harness in the future sections. For now let’s dive into startup lifecircle.

## Idea

You have a concept. You think people have this problem. Now you're testing whether it's real.

### Artifacts

1. Detailed research on 10 clothest competitors
2. 50 real potential buyers complaining about problem or asking for a solution
3. Technical Feasibility
4. GTM strategy
5. Pitch Deck 

## **Validation**

The idea is finalized, but you don’t yet know if people gonna like your solution.

### Artifacts

1. User Stories
2. Product Design Document 
3. Waitlist of 100 people
4. 10 influencers with following more than 5k are ready to promote the product

## **MVP**

You know there is a place on the market for your idea. You know exactly how the final solution gonna look like and you even have people interested.

### Artifacts

1. Technical Architecture
2. Publicly accesible MVP
3. Feedback from 20 beta testers

## **Launch**

You have the product working and delivering real value people are ready to pay for.

### Artifacts

1. Completed Launch Checklist
2. Social Media Accounts with total of 1k+ followers 
3. ADS with a positive ROI
4. 10 paid clients

## **Distribution**

The product is validated and generates revenue.

### Artifacts

1. $5k MRR with >20% margin

## PMF

Your product is validated, have real users and starts to grow on itself.

### Artifacts

1. 100+ mentioning of your brand across internet (not from you)
2. 10% of customers refer at least 1 friend a month
3. $20k MRR with >50% margin
4. Public rating of >4.5 stars with 100+ reviewers

## Support

You are a well known brand solving problem people care about. You listen to what clients say and iterate to grow the business to a maximum capacity

### Artifacts

1. (if applicable) Client retention is higher than industry average 
2. Public rating of >4.5 stars with 1000+ reviewers
3. $100k MRR with >80% margin

## Exit

You grew startup to a point where it can be handed over to a buyer that would be ready to pay a decent amount for it.

### Artifacts

1. Unit economy
2. Financial Forecast
3. At least 5 interested buyers

## Closing

You failed one of the stages and decided that skipping this idea would only save you time and money.

### Artifacts

1. Startup Retrospective
2. Public Facing report about the startup progress and decision

# Startup Workspace Design

The core phylosophy says that everything needs to be replicable, incuding startups themself. Why dealing with 30 different services for storing data, if in reality (almost) everything can be just stored in git. The only exception could be API keys and assets like videos, images, voices etc.

The exact structure of the repo gonna vary from startup to startup but the core folders and files are defined as a part of framework.

The most important rule is that startup workspace have to be logically seprated from the startup-factory framework itself. All skills, MCPS, and configurations defined here are made specifically for this project, not for the startup factory. 

This makes this repo structure universal in a way, where startup-factory framework could evolve independently from the startup workspace framework. Anyone could clone this repo and run a business even without using the agents.

Here is how the common structure of startup workspace look like:

1. .<startup id> - plugin defining all required AI infrastructure. Follows the Claude convention https://code.claude.com/docs/en/plugins#plugin-structure-overview.
    1. plugin.json → basic metadata for the plugin
    2. skills → skills related specifically to this project
    3. agents → core sub-agents required to operate the startup
    4. hooks → hooks required for agents working on this startup
    5. .mcp.json → MCP servers required to operate the startup
    6. .lsp.json → LSP servers for technologies used in the startup
    7. bin → executable files that are automatically added to PATH
2. docs
    1. business_stages → contains folders with artifacts for every stage of the startup. Managed by CEO. All documents required by stage, have to be here
    2. operations → flat or nested folder with operations required to run the startup. Managed by CEO. Contains only highly structured documents for guiding agents and employees of common operatons required to run this startup.
    3. technology → flat or nested folder with documentation related to technology part of the startup. Managed by CTO.
    4. growth → flat or nested folder with documentation related to growth (marketing, sales, retention). Managed by CMO. 
3. internals → folder with internal tooling used for marketing, deplpyment etc.
    1. infrastructure → IaaC that spins up infrastructure and deploys everything in 1 click (Pulumi prefered, Coolify prefered)
    2. content-studio → remotion repository with workflows for creation of content
4. apps → client-facing services including backend, frontend, landings etc.
5. packages → libraries shared between different apps
    1. configurations → global configurations for startup (name, logo, colours etc.). The core library required for simple replicability of the same startup with different names and other configs. All internals and apps have to commit on using it instead of harcoding values.
    2. components → UI components described with Storybook used on the frontend, landing, as well as content-studio. Using clean components and Storybook make content-studio x10 more powerful.
    3. schemas → interfaces and classes shared between applications
    4. utils → unility functions that could be shared between different applications 
6. docker → a folder with dockerfiles describing how to build each of the apps and internals
7. docker-compose → file that launches all of the apps, internals and MCPs with a single command
8. .env.requirements → secrets required to operate this startup

The startup factory is framework agnostic, yet it was designed by a person that writes everything in TS, so the structure is highly inspired by how TS monorepos are usually structured. All of the startups are also going to be made with TS, to simplify deployment and support process.