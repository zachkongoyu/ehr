# ehr

Clinic history for a small Hong Kong practice. The interface is Traditional Chinese by default. Switch to English from the sidebar.

## Run

```bash
npm install
npm run dev
```

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in `.env.local`. See `.env.example`. Do not commit those values.

Sign in, choose a patient in the sidebar, and open a visit on the timeline. The card under the timeline shows that visit. **填寫這次就診** opens the form.

On the sample visit, **今日有心悸嗎？** shows **心悸持續了多久？** only after 有. Atenolol is left off the medicine list when sick sinus syndrome (HKCTT 7871) is already an active problem.
