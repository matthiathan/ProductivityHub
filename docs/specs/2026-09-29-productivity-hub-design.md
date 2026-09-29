# Productivity Hub — Design Specification

Date: 2026-09-29
Status: Draft for user review

## 1. Purpose

Build a new single-user productivity web application to replace the current Concentrix website only after the new system is complete and verified. The application will use a dark analytics-first dashboard and will be stored in a new GitHub repository. A separate Supabase project will be used for authentication and all productivity data.

## 2. Product Scope

The application is for one user only. It will support:

- Personal task management
- 5-stage task workflow
- Projects
- Recurring tasks
- Time tracking
- General focus sessions
- Goals
- Website-only reminders and notifications
- Calendar views
- Productivity analytics
- Notes/documents
- Persistent authenticated sessions on trusted devices

The current Concentrix site will remain live until the replacement is ready for cutover.

## 3. Technology Architecture

### Frontend
- React
- TypeScript
- Vite
- Dark dashboard UI inspired by the selected mockup
- Responsive desktop-first layout

### Backend / Data
- Separate Supabase project
- Supabase Auth for one permitted account
- Postgres database for tasks, projects, time, goals, reminders, and analytics
- Row Level Security enabled on exposed tables
- Supabase Realtime where useful for live dashboard updates

### Hosting
- New GitHub repository
- Build/test independently from the existing Concentrix repository
- Deploy as a new preview/replacement service first
- Switch the existing Render-hosted Concentrix deployment only after acceptance testing

## 4. Authentication

- Email/password login
- No public signup page
- Persistent session on trusted devices
- Manual sign out
- Password reset
- Route protection for all productivity pages
- Only the permitted user account may access application data

## 5. Navigation

Primary navigation:

1. Dashboard
2. My Tasks
3. Projects
4. Calendar
5. Time Tracking
6. Analytics
7. Goals
8. Notes
9. Settings

## 6. Dashboard

The home dashboard will use the approved dark design language.

### KPI cards
- Tasks completed
- Focus hours
- Active projects
- Productivity score

### Main analytics
- Productivity trends
- Task completion rate
- Focus hours by day/week
- Project status
- Productivity calendar heatmap

### Action panels
- My To-Do
- Upcoming deadlines
- Active goals
- Website notifications/reminders

Team leaderboard and department comparison elements from the inspiration mockup will be replaced with personal goal progress, upcoming deadlines, and personal trend analysis.

## 7. Task Management

### Workflow
Backlog → To Do → In Progress → Review → Done

### Priorities
- Low
- Medium
- High
- Critical

### Task fields
- Title
- Description
- Status
- Priority
- Project
- Tags
- Due date and optional due time
- Estimated duration
- Actual tracked time
- Recurrence rule
- Subtasks/checklist
- Notes
- Reminder configuration
- Created timestamp
- Started timestamp
- Completed timestamp
- Archived flag

### Views
- List
- Kanban
- Today
- Upcoming
- Overdue
- Completed

## 8. Recurring Tasks

Recurring tasks are a first-class feature.

Supported recurrence:
- Daily
- Weekly
- Monthly
- Custom recurrence rules

Design rule:
- A recurrence definition acts as the template.
- Each generated occurrence is stored separately.
- Completing one occurrence does not overwrite historical occurrences.
- Streaks and analytics are based on actual occurrence history.
- The next occurrence is created according to the recurrence rule.

## 9. Projects

### Project workflow
Planned → Active → On Hold → Completed → Archived

### Project fields
- Name
- Description
- Status
- Start date
- Target date
- Progress
- Linked tasks
- Tracked time
- Optional linked goal
- Created/updated timestamps

Project progress will be calculated primarily from linked task completion, with optional manual override deferred unless later required.

## 10. Time Tracking

Two modes are supported.

### Task-linked timer
- Start/stop timer from a task
- Session automatically linked to task and project
- Updates actual tracked time

### General focus session
- No task required
- Optional category such as Deep Work, Planning, Admin, Learning
- Optional project link
- Counts toward focus analytics

### Manual entries
- User may add or correct time manually
- Manual entries are recorded separately from live-timer sessions

## 11. Goals

Three goal types:

### Numeric goals
Example: 20 focus hours this week.

### Task-based goals
Example: complete 15 tasks this week.

### Project/milestone goals
Example: finish a project by a target date.

Goal fields include:
- Name
- Goal type
- Target value / target entity
- Start date
- Deadline
- Current progress
- Status
- Completion timestamp

## 12. Website Reminders and Notifications

Reminders are website-only.

Supported reminder sources:
- Task deadlines
- Recurring task occurrences
- Scheduled focus sessions
- Goal deadlines

UI behavior:
- Notification bell
- Unread badge
- Upcoming reminders
- Overdue warnings
- Dismiss/read actions

No machine, SMS, push-to-device, or external notification channel is required for version 1.

## 13. Productivity Score

The productivity score will be transparent and composed from several measurable components rather than a hidden arbitrary value.

Initial components:

- Task completion
- Priority-weighted completion
- Focus time against target
- Deadline performance
- Goal progress
- Consistency/streaks
- Overdue workload penalty

Proposed initial weighting:
- Task completion: 25%
- Focus time: 20%
- Deadline performance: 20%
- Goal progress: 15%
- Consistency: 10%
- Workload control: 10%

The score will be normalized to 0–100.

Raw component values will always be visible in Analytics so the score remains explainable.

### Priority weights
- Low: 1.0
- Medium: 1.25
- High: 1.5
- Critical: 2.0

These weights may later be configurable in Settings.

## 14. Analytics

Analytics periods:
- Today
- 7 days
- 30 days
- Month
- Custom range

Metrics:
- Tasks created
- Tasks completed
- Completion rate
- On-time completion rate
- Overdue task count
- Average task cycle time
- Focus hours
- Estimated vs actual time
- Goal progress
- Productivity score history
- Streaks
- Workload by task status
- Project completion progress

## 15. Calendar

Calendar will display:
- Task due dates
- Project deadlines
- Goal deadlines
- Scheduled focus sessions
- Recurring task occurrences

Views:
- Month
- Week
- Agenda

## 16. Notes

Lightweight notes area for:
- General notes
- Project-linked notes
- Task-linked notes

Version 1 does not require collaborative editing, file storage, or advanced document management.

## 17. Settings

Settings will include:
- Account details
- Password change
- Sign out
- Daily focus target
- Weekly task target
- Productivity score preferences
- Default task priority
- Default task view
- Week-start preference
- Working hours
- Theme preference retained as dark-first

## 18. Proposed Supabase Data Model

Core tables:

- profiles
- projects
- tasks
- task_occurrences
- subtasks
- tags
- task_tags
- time_entries
- focus_sessions
- goals
- goal_progress
- reminders
- notifications
- notes
- productivity_snapshots
- user_settings

### Ownership
Every user-owned row will carry a user_id tied to auth.users.

### Security
- RLS enabled on all exposed tables
- Policies require auth.uid() = user_id
- No service-role key exposed to the browser
- Frontend uses the Supabase publishable/anon-compatible client key only

## 19. Data Flow

1. User signs in.
2. Frontend loads authenticated user data from Supabase.
3. Task/project/time/goal changes write directly through Supabase under RLS.
4. Dashboard queries source tables and derived views/RPCs where appropriate.
5. Productivity snapshots are calculated periodically and/or on meaningful state changes.
6. Realtime subscriptions refresh high-value dashboard data without manual reloads.

## 20. Error Handling

- Clear inline validation on forms
- Optimistic UI only where rollback is safe
- Toast/banner on failed writes
- Retry actions for transient read failures
- Timer state protected against accidental page refresh where practical
- No silent failure for task completion, time tracking, or reminder updates

## 21. Testing Strategy

### Unit-level
- Productivity score calculations
- Recurrence generation
- Deadline and overdue logic
- Duration calculations

### Integration-level
- Supabase auth
- CRUD under RLS
- Timer start/stop persistence
- Recurring occurrence generation
- Goal progress updates

### End-to-end
- Login
- Create task
- Move through all 5 statuses
- Start/stop task timer
- Complete recurring occurrence
- Create and complete goal
- Dashboard metrics update
- Logout/login with persistent trusted-device session behavior

## 22. Deployment / Cutover Plan

1. Create new GitHub repository.
2. Scaffold frontend.
3. Create separate Supabase project.
4. Implement schema and security.
5. Build core task workflow.
6. Add projects.
7. Add time tracking and focus sessions.
8. Add goals.
9. Add reminders/notifications.
10. Build dashboard and analytics.
11. Add notes/settings.
12. Deploy new app separately for testing.
13. Run acceptance tests.
14. Point the existing Concentrix Render deployment to the new repository/build only after approval.
15. Verify production deployment and retain rollback path to the original Concentrix repo.

## 23. Explicitly Out of Scope for Version 1

- Multi-user/team management
- Department analytics
- Public registration
- Mobile app
- SMS/email reminders
- Machine/device notifications
- External calendar sync
- Collaborative notes
- File/document storage
- AI task generation

These can be added later without changing the core model.

## 24. Acceptance Criteria

Version 1 is ready for production when:

- User can securely log in and remain signed in on a trusted browser.
- User can create, edit, delete, archive, prioritize, tag, and move tasks through all five statuses.
- Recurring tasks generate independently trackable occurrences.
- Projects track task progress and time.
- Live and manual time tracking work for task-linked and general focus sessions.
- All three goal types work.
- Website reminders correctly surface upcoming and overdue items.
- Dashboard metrics use real database data.
- Productivity score is reproducible from visible component metrics.
- Analytics work across selected date ranges.
- Data is protected by RLS.
- Production deployment can replace Concentrix with a rollback path.
