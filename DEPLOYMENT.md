# Render Deployment Guide

## Prerequisites
- A Render account (https://render.com)
- GitHub repository with your code pushed

## Deployment Steps

### 1. Connect Repository
1. Log in to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `climbup-nextjs` repository

### 2. Configure Service
Render will auto-detect the `render.yaml` configuration, or manually set:

- **Name**: climbup-nextjs (or your preferred name)
- **Region**: Oregon (or closest to your users)
- **Branch**: main
- **Root Directory**: `climbup-nextjs`
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Environment Variables
Add these in Render Dashboard under "Environment":

```
NEXT_PUBLIC_SUPABASE_URL=https://jueoglgbseoxszygpjdb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_GngNvovFddhjuAEDRxL0Zw_Xtv80OqE
```

**Important**: Never commit actual secrets to git. The values above should be added through Render's dashboard.

### 4. Deploy
Click "Create Web Service" and Render will:
- Install dependencies
- Build your Next.js app
- Start the production server
- Provide you with a live URL

## Post-Deployment

### Update Supabase Redirect URLs
Add your Render URL to Supabase allowed redirect URLs:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Render URL (e.g., `https://your-app.onrender.com`) to:
   - Site URL
   - Redirect URLs

### Configure Supabase Email OTP
The app uses a 6-digit email OTP flow, not a magic link. Supabase sends either a magic link or an OTP from the same `signInWithOtp` API depending on the Magic Link email template.

1. Go to Supabase Dashboard -> Authentication -> Email Templates.
2. Open the Magic Link template.
3. Replace link-based content that uses `{{ .ConfirmationURL }}` with OTP content that uses `{{ .Token }}`.

Example template:

```html
<h2>Your ClimbUP login code</h2>
<p>Enter this 6-digit code in ClimbUP:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
<p>This code expires soon. If you did not request it, you can ignore this email.</p>
```

Do not include `{{ .ConfirmationURL }}` in this template for the OTP UI, otherwise Supabase will send a magic link instead of a code. Supabase's default resend limit is one OTP request every 60 seconds; the UI cooldown matches that default.

### Monitoring
- Check logs in Render Dashboard
- Set up health checks if needed
- Configure custom domain (optional)

## Automatic Deployments
Render automatically deploys when you push to your connected branch.

## Troubleshooting

### Build Fails
- Check Node version matches (20.11.0)
- Verify all dependencies are in package.json
- Review build logs in Render dashboard

### Environment Variables
- Ensure all required env vars are set in Render
- Check variable names match exactly (case-sensitive)

### Runtime Errors
- Check server logs in Render dashboard
- Verify Supabase URLs are accessible
- Confirm redirect URLs are configured in Supabase
