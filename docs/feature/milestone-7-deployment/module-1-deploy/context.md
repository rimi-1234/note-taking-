# Context - Deploy

**Production settings**
- Backend: `NODE_ENV=production` (gives `Secure; SameSite=None` cookies and `autoIndex` off), `CORS_ORIGINS=https://<app>.vercel.app`.
- Frontend: `NEXT_PUBLIC_API_URL=https://<service>.onrender.com/api`.
- Render free instances sleep after inactivity; the first request can take about 50 seconds. Mention this in the submission.
