# CMO Skills

This document lists all skills available to the CMO agent for marketing, content creation, and growth.

## Content & Marketing Skills

### 1. Content Studio (`content-studio`)
**Location:** `/data/workspace/startup-template/internals/content-studio`
**Purpose:** AI-powered content generation
**Key Capabilities:**
- Blog post writing
- Marketing copy creation
- SEO optimization
- Content calendars

### 2. Video Producer (`video-producer`)
**Location:** `/data/workspace/skills/video-producer`
**Purpose:** Video content creation
**Key Capabilities:**
- Demo video production
- Tutorial creation
- Social media video content
- YouTube content

### 3. X/Twitter (`x-twitter`)
**Location:** `/data/workspace/skills/x-twitter`
**Purpose:** Social media marketing
**Key Capabilities:**
- Tweet automation
- Thread creation
- Viral content strategy
- Engagement campaigns
- Influencer outreach

### 4. Meta MCP (`metamcp`)
**Location:** `/data/workspace/skills/metamcp`
**Purpose:** Meta platform marketing
**Key Capabilities:**
- Facebook/Instagram integration
- Ad campaign management
- Analytics and insights
- Audience targeting

## Growth Skills

### 5. Growth Playbook
**Location:** `/data/workspace/startup-template/docs/growth/`
**Purpose:** Growth strategies and tactics
**Key Capabilities:**
- Growth hacking frameworks
- Viral loops
- Referral programs
- A/B testing strategies

### 6. Marketingskills (if available)
**Purpose:** Comprehensive marketing toolkit
**Key Capabilities:**
- Campaign management
- Brand strategy
- Market positioning
- Competitive analysis

### 7. Remotion Best Practices (`remotion-best-practices`)
**Purpose:** Video animation and motion graphics
**Key Capabilities:**
- Animated logos
- Data visualization videos
- Product demo animations
- Social media motion content

## Analytics & Optimization

### 8. Analytics Integration
**Purpose:** Data-driven marketing
**Key Capabilities:**
- Google Analytics setup
- Conversion tracking
- Funnel analysis
- ROI measurement

### 9. SEO Skills
**Purpose:** Search engine optimization
**Key Capabilities:**
- Keyword research
- On-page optimization
- Link building strategies
- Technical SEO

## Brand & Design

### 10. Frontend Design (`frontend-design`)
**Location:** `/data/workspace/skills/frontend-design`
**Purpose:** Landing page creation
**Key Capabilities:**
- High-converting landing pages
- A/B testable designs
- Mobile-first layouts
- Brand-consistent styling

### 11. shadcn Components
**Purpose:** UI component library
**Key Capabilities:**
- Marketing site components
- Email capture forms
- Pricing tables
- Feature showcases

## Social & Community

### 12. Community Building
**Purpose:** Audience development
**Key Capabilities:**
- Discord community setup
- Reddit marketing
- HackerNews strategy
- Slack communities

### 13. Influencer Outreach
**Purpose:** Partnership development
**Key Capabilities:**
- Micro-influencer identification
- Collaboration negotiation
- Sponsored content

## Campaign Management

### 14. Email Marketing
**Purpose:** Email campaigns and automation
**Key Capabilities:**
- Newsletter creation
- Drip campaigns
- Welcome sequences
- Abandonment emails

### 15. Paid Advertising
**Purpose:** Ad campaign management
**Key Capabilities:**
- Google Ads setup
- Facebook/Instagram Ads
- LinkedIn Ads
- Retargeting campaigns

### 16. PR & Communications
**Purpose:** Press and media relations
**Key Capabilities:**
- Press release writing
- Media kit creation
- Journalist outreach
- Interview preparation

## Content Types

| Content Type | Skills Used |
|--------------|-------------|
| Blog Posts | Content Studio, SEO |
| Social Media | X/Twitter, Video Producer, Meta MCP |
| Landing Pages | Frontend Design, shadcn |
| Email Campaigns | Email Marketing, Analytics |
| Video Content | Video Producer, Remotion |
| Documentation | Notion, Content Studio |

## Skill Usage

To invoke a skill:
```
/skill <skill-name> [arguments]
```

For example:
```
/skill x-twitter create-thread --topic launch-announcement
/skill video-producer create-demo --duration 60
/skill content-studio write-blog --keyword "AI startup"
```

## Marketing Workflows

### Launch Campaign
1. Use `content-studio` for launch announcement copy
2. Use `video-producer` for demo video
3. Use `x-twitter` for thread announcement
4. Use `frontend-design` for landing page
5. Use `email-marketing` for launch email

### Content Pipeline
1. Use `content-studio` for blog posts
2. Use `video-producer` for YouTube content
3. Use `x-twitter` for social promotion
4. Use `analytics` for performance tracking

### Growth Experiments
1. Use `growth-playbook` for strategy
2. Use `analytics` for baseline metrics
3. Use `x-twitter` for viral loop
4. Use `ab-testing` for optimization

## Skill Configuration

Marketing skills are configured via:
- API keys for social platforms
- Analytics credentials
- Brand guidelines and voice

## CMO Workspace

The CMO agent operates from:
- Marketing docs: `/data/workspace/startup-template/docs/growth/`
- Content assets: `/data/workspace/startup-template/internals/content-studio/`
- Skills: `/data/workspace/skills/` (marketing-related skills)

## Key Metrics

| Metric | Skills Involved |
|--------|----------------|
| Traffic | SEO, Content, Social |
| Conversion | Landing Pages, Email, Analytics |
| Engagement | Social, Community, Video |
| Retention | Email, Community, Content |
| Revenue | Analytics, Growth, Paid Ads |
