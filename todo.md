# Athenaeum Simplification Checklist

- [x] Define the simplified school-hub information architecture and preserve only task-planning essentials.
- [x] Prepare the current Athenaeum source and publish it to MomoMunch/ManusWebApp.
- [ ] Enable and authorize Google Calendar for Athenaeum-created event syncing.
- [x] Upgrade the project with secure authenticated integration capabilities for Google Calendar event creation.
- [ ] Configure the provided Google OAuth credentials and register the production callback URL in Google Cloud.
- [x] Replace study-specific navigation with a quick-capture task hub, agenda, and calendar views.
- [x] Build Google Calendar-style month, week, day, and agenda views with event creation and editing.
- [x] Add task due dates, reminders, priority, subject/category, and completion workflows.
- [ ] Complete and verify Google Calendar event creation whenever a scheduled item is added in Athenaeum.
- [x] Apply Google Calendar default reminders by default, while permitting explicit per-item overrides for phone alerts.
- [ ] Validate task creation, calendar scheduling, mobile-responsive use, and optional sync guidance.
- [x] Regenerate pnpm-lock.yaml after the full-stack upgrade and verify a frozen-lockfile install succeeds.
- [x] Publish the dependency-lockfile repair to MomoMunch/ManusWebApp for deployment.
