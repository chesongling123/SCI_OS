# Skill Development Guide for PhD_OS

> How to write OpenClaw Skills that define research-focused AI agent behaviors.

---

## 1. What is a Skill

A Skill is a Markdown file (`SKILL.md`) that teaches the OpenClaw agent how to perform a specific task. Skills:
- Live in `~/.openclaw/workspace/skills/<skill-name>/SKILL.md`
- Contain YAML frontmatter (metadata) + natural language instructions
- Are activated on demand by the agent or explicitly by the user
- Can reference MCP tools by name
- Are the primary way to customize agent behavior without writing code

## 2. Skill File Structure

```markdown
---
name: skill-name
version: 1.0.0
author: phd-os-team
description: What this skill does
tools:
  - tool-name-1
  - tool-name-2
mcpServers:
  - mcp-server-name-1
  - mcp-server-name-2
---

# Skill Title

## Overview

Description of what this skill accomplishes and when to use it.

## Workflow

### Step 1: [Action Name]

- Instruction for the agent
- Instruction for the agent
- Tool call example: `use tool-name-1 with { param: "value" }`

### Step 2: [Action Name]

- Instruction for the agent
- Expected output format

## Output Format

```markdown
Template for the final output
```

## Rules

- Constraint 1
- Constraint 2
- Constraint 3
```

## 3. Complete Skill Examples

### Skill 1: AI Diary Generation

```markdown
---
name: phd-ai-diary
version: 1.0.0
author: phd-os-team
description: Generate a structured research diary entry by fusing pomodoro data, calendar events, and task progress
tools:
  - get_today_sessions
  - get_focus_stats
  - get_today_events
  - get_active_tasks
  - get_recently_completed
  - search_notes
  - create_note
mcpServers:
  - phd-pomodoro
  - phd-task
  - phd-calendar
  - phd-note
---

# AI Diary Generation

Generate a structured research diary entry for the user at the end of each day.

## When to Use

When the user asks for "today's summary", "daily review", "what did I do today", or when triggered by the daily cron job at 22:00.

## Workflow

### Step 1: Collect Activity Data

1. Call `phd-pomodoro/get_today_sessions` to get today's pomodoro sessions
2. Call `phd-calendar/get_today_events` to get today's calendar events
3. Call `phd-task/get_recently_completed` to get recently completed tasks
4. Call `phd-task/get_active_tasks` to get currently active tasks

### Step 2: Analyze Patterns

From the collected data, identify:

- **Focus blocks**: Longest uninterrupted work periods
- **Context switches**: Number of different tasks worked on
- **Meeting load**: Total time spent in meetings vs. deep work
- **Task completion velocity**: Tasks completed vs. tasks started

### Step 3: Cross-Reference with Knowledge Base

1. Call `phd-note/search_notes` with keywords from the most worked-on task names
2. Find connections between today's work and past notes
3. Identify any recurring themes or patterns

### Step 4: Generate Diary Entry

Write a structured diary entry in this format:

```markdown
# Research Diary — YYYY-MM-DD (Day of Week)

## Today's Focus

[1-2 sentence summary of the main research activity]

## Work Log

### Deep Work Sessions
- [Task Name]: [Duration] ([Time Range])
  - [Notes from pomodoro if available]

### Meetings & Events
- [Event Name]: [Duration] ([Time Range])

### Tasks Progress
- Completed: [List of completed tasks]
- In Progress: [List of active tasks]

## Reflection

### What Went Well
- [Insight based on data]

### Challenges
- [Note any interruptions or blocks]

### Connections
- [Links to previous related work found in notes]

### Tomorrow's Priority
- [Suggest top priority based on active tasks and deadlines]
```

### Step 5: Save and Notify

1. Call `phd-note/create_note` with the diary content
2. Tag with `#diary` and `#auto-generated`
3. If configured, send a summary via the user's preferred channel

## Rules

- Always use the exact date format YYYY-MM-DD
- Duration values must include units (e.g., "25 minutes", "1.5 hours")
- Reflection insights must be grounded in actual data, not generic
- Never fabricate information — if data is missing, note "No data available"
- Keep the tone professional but personal (this is a private research diary)
- Tomorrow's priority should be based on task urgency and recent focus patterns
```

### Skill 2: Smart Literature Search

```markdown
---
name: phd-literature-search
version: 1.0.0
author: phd-os-team
description: Search for relevant research papers across multiple sources, filter by relevance, and generate structured summaries
tools:
  - search_papers
  - get_paper_details
  - add_to_library
  - create_note
  - get_active_tasks
mcpServers:
  - arxiv-mcp
  - semantic-scholar-mcp
  - zotero-write-mcp
  - phd-note
  - phd-task
---

# Smart Literature Search

Search for, evaluate, and organize research papers relevant to the user's current research.

## When to Use

When the user asks to "find papers about X", "search for recent research on Y", "get me papers about Z", or when the weekly literature cron job runs.

## Workflow

### Step 1: Understand Research Context

1. Call `phd-task/get_active_tasks` to understand current research focus
2. Extract key themes from active task titles and descriptions
3. Combine with user's explicit search query

### Step 2: Multi-Source Search

1. Call `arxiv-mcp/search_papers` with query (limit: 10, sort: relevance, date: last 30 days)
2. Call `semantic-scholar-mcp/search_papers` with same query (limit: 10)
3. Merge results, deduplicate by DOI or title

### Step 3: Relevance Filtering

Score each paper 1-5 based on:
- Keyword overlap with active tasks (weight: 40%)
- Citation count and recency (weight: 30%)
- Abstract semantic relevance to research themes (weight: 30%)

Keep papers with score >= 3.

### Step 4: Structured Summary

For each high-relevance paper, generate:

```markdown
### [Paper Title]

- **Authors**: [Author list]
- **Venue**: [Conference/Journal, Year]
- **DOI**: [DOI link]
- **Relevance Score**: [X/5]
- **Why Relevant**: [1-2 sentence connection to user's research]

**Problem**: [Research problem in 1 sentence]
**Method**: [Key methodology in 1-2 sentences]
**Result**: [Main finding in 1 sentence]
**Connection**: [How this connects to user's active tasks]
```

### Step 5: User Action Options

Present results with these action options:
- "Add to Zotero" → Call `zotero-write-mcp/add_to_library`
- "Take notes" → Call `phd-note/create_note` with paper metadata
- "Find related" → Re-run search with this paper's keywords expanded

## Rules

- Always search at least 2 sources (arXiv + Semantic Scholar)
- Never return more than 10 papers total
- Relevance scores must be justified with specific reasoning
- DO NOT hallucinate paper content — only summarize what's in the abstract
- If no papers are found, suggest alternative keywords rather than returning empty results
```

### Skill 3: Smart Schedule Recommendations

```markdown
---
name: phd-smart-schedule
version: 1.0.0
author: phd-os-team
description: Analyze focus patterns and recommend optimal work schedule
tools:
  - get_optimal_focus_hours
  - get_focus_stats
  - get_week_overview
  - get_upcoming_deadlines
  - get_active_tasks
mcpServers:
  - phd-pomodoro
  - phd-calendar
  - phd-task
---

# Smart Schedule Recommendations

Analyze the user's historical focus patterns and recommend an optimal work schedule.

## When to Use

When the user asks "when should I work on X", "plan my week", or "what's my best schedule".

## Workflow

### Step 1: Gather Historical Data

1. Call `phd-pomodoro/get_optimal_focus_hours` with `days: 30`
2. Call `phd-pomodoro/get_focus_stats` for the last 7 days
3. Call `phd-calendar/get_upcoming_deadlines`
4. Call `phd-task/get_active_tasks`

### Step 2: Analyze Patterns

Identify:
- Peak productivity hours (lowest interruption rate)
- Optimal session length (when focus rate is highest)
- Deadline proximity and urgency
- Task priority based on deadline and importance

### Step 3: Generate Schedule

Recommend time blocks in this format:

```markdown
## Recommended Schedule — [Date Range]

### [Day Name] ([Date])
- **High Focus Block** ([Start]-[End]): [Primary task]
  - Reason: [Why this time — cite focus data]
- **Deep Work Block** ([Start]-[End]): [Secondary task]
- **Meeting/Admin Block** ([Start]-[End]): [Calendar events]
- **Break**: [Recommended break times]
```

## Rules

- Never schedule back-to-back focus blocks without breaks
- Respect existing calendar events
- High-cognitive tasks (writing, analysis) go in peak focus hours
- Administrative tasks (email, organizing) go in low-focus hours
- Account for deadline urgency — near-deadline tasks get priority slots
- Recommend pomodoro session counts per block (e.g., "2-3 pomodoros")
```

## 4. Installing Skills

### Method 1: Manual (Development)

```bash
# Create skill directory
mkdir -p ~/.openclaw/workspace/skills/phd-ai-diary

# Copy SKILL.md
cp docs/openclaw/skills/phd-ai-diary.md ~/.openclaw/workspace/skills/phd-ai-diary/SKILL.md

# Restart gateway to pick up
openclaw gateway restart
```

### Method 2: ClawHub (Production)

```bash
# If skill is published to ClawHub
npx clawhub@latest install phd-ai-diary
```

### Method 3: Auto-Discovery (Future)

Skills in `~/.openclaw/workspace/skills/` are auto-discovered on Gateway restart.

## 5. Skill Activation Patterns

| Trigger Method | How It Works | Use Case |
|----------------|-------------|----------|
| Explicit skill name | User says "use phd-ai-diary" | Direct skill invocation |
| Keyword matching | Agent detects "today's summary" | Implicit activation |
| Cron trigger | `openclaw.json` cron config | Automated daily/weekly tasks |
| MCP tool call | Tool returns data needing skill | Chain of operations |

### Cron Configuration Example

Add to `~/.openclaw/openclaw.json`:

```json
{
  "cron": {
    "jobs": [
      {
        "name": "daily-diary",
        "schedule": "0 22 * * *",
        "skill": "phd-ai-diary",
        "message": "Generate today's research diary"
      },
      {
        "name": "weekly-literature",
        "schedule": "0 9 * * 1",
        "skill": "phd-literature-search",
        "message": "Find papers related to my active research tasks"
      }
    ]
  }
}
```

## 6. Skill Testing

```bash
# Test skill with explicit invocation
openclaw agent --skill phd-ai-diary --message "Generate today's diary"

# Check thinking output
openclaw agent --skill phd-ai-diary --message "Generate today's diary" --thinking high

# View logs for debugging
openclaw logs --follow | grep phd-ai-diary
```

## 7. Skill Development Checklist

- [ ] `name` uses `phd-` prefix
- [ ] `version` follows semver
- [ ] `description` clearly explains what the skill does
- [ ] `tools` list includes only tools the skill actually uses
- [ ] `mcpServers` list includes only required MCP Servers
- [ ] Workflow steps are ordered and numbered
- [ ] Each step specifies exact tool calls with parameter examples
- [ ] Output format includes a template
- [ ] Rules section covers edge cases and constraints
- [ ] Skill is tested via `openclaw agent --skill` before deployment
