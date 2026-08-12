# Google Calendar Event-Creation Notes

Athenaeum should create an event in the authorized user’s Google Calendar whenever the user adds a scheduled item. The Google Calendar API creates events through `events.insert()` with a target `calendarId`, start/end values, and an OAuth access token. `calendarId: "primary"` uses the connected user’s primary Google calendar. Timed entries use `start.dateTime` and `end.dateTime`; all-day entries use `start.date` and `end.date`.

For the selected one-way event-creation scope, request the narrowest practical edit scope: `https://www.googleapis.com/auth/calendar.events` (or `calendar.events.owned` if restricting actions to calendars the user owns meets the final product behavior). The app must use a Google OAuth 2.0 Web application with a registered redirect URI and server-side token exchange. Access and refresh tokens must never be exposed to the browser or committed to Git.

Google Calendar event reminders can use an event-level override: set `reminders.useDefault` to `false` and send `reminders.overrides` with `method: "popup"` and the user-selected minutes before the event. Google documents that pop-up reminders are supported in mobile and web clients, which allows the Google Calendar mobile app to deliver the phone alert.

## Sources

- [Create events — Google Calendar API](https://developers.google.com/workspace/calendar/api/guides/create-events)
- [Choose Google Calendar API scopes](https://developers.google.com/workspace/calendar/api/auth)
- [Reminders & notifications — Google Calendar API](https://developers.google.com/workspace/calendar/api/concepts/reminders)
