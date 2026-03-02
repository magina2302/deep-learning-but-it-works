You are updating an educational learning-tracker + chat app UI. Implement the following feature changes and update all relevant screens, components, and flows. Keep the design clean, modular, and consistent with the existing design system (colors, typography, spacing, component styles). Use reusable components and clear states (empty/loading/error).

1) Topics / Modules management

Add an “Add Module/Topic” function that creates a new topic card/box on the Topics dashboard.

Each topic card/box should show: Topic name, short subtitle/optional tags, and quick actions.

Add a “Delete Topic” function (trash icon + confirmation modal). Include delete states (confirm/cancel).

2) Remove UI elements

Remove Improvement Trend completely (no charts/sections for it).

Remove Streak tracking across the entire app (no streak widgets anywhere).

Remove Confidence Gap section/metric from all screens.

3) Forgetting risk handling

Do not display “forgetting risk” prominently in the UI.

Keep it as a background metric for the algorithm (optional: subtle “adaptive learning” indicator or hidden in settings/metadata, but not on main screens).

4) Learning summary

Add a brief “Summary of what you’ve learnt so far” section on the topic view (very short, 2–4 bullets or 1 short paragraph). Keep it minimal and scannable.

5) Authentication

Add a Login page with username + password.

Add a Sign Up page with username + password + confirm password (optional: email).

Include: validation states, “Forgot password?” link placeholder, and primary/secondary buttons.

6) Chat enhancements

In each chat (topic-specific chat screens), add an Upload File function:

Paperclip/upload icon near the message input.

Upload modal or panel with file preview and remove option.

Support multiple attachments.

For file uploads, include separate selectable boxes/categories:

Lecture

PYP

Tutorial

Labs
Each category should be a distinct selectable card/button with clear selected state.

Deliverables in Figma

Updated screens: Topics dashboard, Topic detail, Chat screen, Upload modal/panel, Login, Sign Up, Delete confirmation modal.

Component specs: topic card/box component, add-topic modal, delete modal, upload category selector, file chip/attachment preview.

Show key user flows: Sign up → Topics → Add Topic → Open Topic Chat → Upload file (choose category) → Send message → Delete topic.