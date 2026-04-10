# CTO Skills

This document lists all skills available to the CTO agent for building and deploying startups.

## Core Skills

### 1. Frontend Design (`frontend-design`)
**Location:** `/data/workspace/skills/frontend-design`
**Purpose:** UI/UX design, component libraries, responsive layouts
**Key Capabilities:**
- shadcn/ui components
- Tailwind CSS styling
- React component architecture
- Figma-to-code workflows

### 2. Component Library (`shadcn`)
**Purpose:** Rapid UI development with shadcn/ui
**Key Capabilities:**
- Pre-built accessible components
- Dark mode support
- Customizable themes
- TypeScript-first

### 3. Coolify Manager (`coolify-cli`)
**Location:** `/data/workspace/skills/coolify-cli`
**Purpose:** Deployment and infrastructure management
**Key Capabilities:**
- Application deployment
- Environment configuration
- Domain management
- SSL certificates
- Database provisioning

### 4. DevOps (`devops`)
**Location:** `/data/workspace/skills/devops`
**Purpose:** CI/CD, containerization, infrastructure
**Key Capabilities:**
- Docker containerization
- GitHub Actions workflows
- Kubernetes manifests
- Monitoring and logging

### 5. Builder (`builder`)
**Location:** `/data/workspace/skills/builder`
**Purpose:** General code generation and implementation
**Key Capabilities:**
- Full-stack development
- API design
- Database schema design
- Testing strategies

### 6. QA Lead (`qa-lead`)
**Location:** `/data/workspace/skills/qa-lead`
**Purpose:** Quality assurance and testing
**Key Capabilities:**
- Test strategy development
- Automated testing
- Performance benchmarking
- Security auditing

### 7. Projects DB Framework (`projects-db-framework`)
**Location:** `/data/workspace/skills/projects-db-framework`
**Purpose:** Project management and database frameworks
**Key Capabilities:**
- Project lifecycle tracking
- Database integration patterns
- Data modeling

### 8. Notion Integration (`notion`)
**Location:** `/data/workspace/skills/notion`
**Purpose:** Documentation and knowledge management
**Key Capabilities:**
- Notion API integration
- Documentation automation
- Project wikis

### 9. Jira CLI (`jira-cli`)
**Location:** `/data/workspace/skills/jira-cli`
**Purpose:** Issue tracking and project management
**Key Capabilities:**
- Sprint management
- Issue creation and tracking
- Kanban board operations

### 10. Video Producer (`video-producer`)
**Location:** `/data/workspace/skills/video-producer`
**Purpose:** Video content creation
**Key Capabilities:**
- Demo video production
- Tutorial creation
- Social media content

## API & Integration Skills

### 11. FAL AI (`fal-ai`)
**Location:** `/data/workspace/skills/fal-ai`
**Purpose:** AI/ML model integration
**Key Capabilities:**
- Image generation
- AI model deployment
- API integration

### 12. Meta MCP (`metamcp`)
**Location:** `/data/workspace/skills/metamcp`
**Purpose:** Meta platform integrations
**Key Capabilities:**
- Social media APIs
- Analytics integration

### 13. X/Twitter (`x-twitter`)
**Location:** `/data/workspace/skills/x-twitter`
**Purpose:** Social platform automation
**Key Capabilities:**
- Tweet automation
- Thread creation
- Engagement tracking

### 14. Nano Banana Pro (`nano-banana-pro`)
**Purpose:** Custom agent tool

### 15. Moltbook Interact (`moltbook-interact`)
**Location:** `/data/workspace/skills/moltbook-interact`
**Purpose:** Educational platform integration

### 16. Bitwarden CLI (`bitwarden-cli`)
**Location:** `/data/workspace/skills/bitwarden-cli`
**Purpose:** Secret management
**Key Capabilities:**
- Password management
- Secure credential storage
- Team sharing

## Infrastructure Skills

### 17. Personal Productivity (`personal-productivity`)
**Location:** `/data/workspace/skills/personal-productivity`
**Purpose:** Developer productivity tools
**Key Capabilities:**
- Workflow automation
- Script management
- Tool integration

### 18. Projects DB (`projects-db`)
**Location:** `/data/workspace/skills/projects-db`
**Purpose:** Project data management
**Key Capabilities:**
- CRUD operations
- Data validation
- Query optimization

## Skill Usage

To invoke a skill, the CTO agent can use:
```
/skill <skill-name> [arguments]
```

For example:
```
/skill coolify-cli deploy --app my-startup
/skill frontend-design create-dashboard
/skill devops setup-ci-cd
```

## Skill Configuration

Skills are configured via environment variables and stored in the agent's workspace at:
- Skills directory: `/data/workspace/skills/`
- Skill configs: Individual SKILL.md files in each skill directory

## Skill Development

To create a new skill:
1. Create a skill directory under `/data/workspace/skills/<skill-name>/`
2. Add a SKILL.md with usage instructions
3. Implement the skill functionality
4. Document any required environment variables
