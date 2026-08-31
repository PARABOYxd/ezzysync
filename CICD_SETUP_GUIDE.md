# ?? Multi-Cloud CI/CD & Environment Setup Guide

This guide explains how your automated CI/CD pipeline works and the exact environment variables & GitHub secrets to configure across **Render**, **Railway**, and **Vercel**.

---

## ? How the Automated Pipeline Works

| Action | Target Environment | Automated Deployment Actions |
| :--- | :--- | :--- |
| **`git push origin dev`** | **Development / Staging** | 1. Runs CI tests & Vite build<br>2. Deploys Backend to **Render Dev Server**<br>3. Deploys Frontend to **Vercel Preview/Dev** |
| **`git push origin main`** | **Production** | 1. Runs strict Production checks<br>2. Deploys Backend to **Railway Production**<br>3. Deploys Frontend to **Vercel Production** |
| **Pull Request to `main`/`dev`** | **Pre-Merge Gatekeeper** | Validates code integrity before merge is allowed |

---

## ?? Part 1: GitHub Repository Secrets Setup

In your GitHub repository, go to **Settings ? Secrets and variables ? Actions ? New repository secret** and add these secrets:

### 1. Render Dev Deployment
- **`RENDER_DEV_DEPLOY_HOOK`**
  * **Where to get:** Render Dashboard ? Your Backend Web Service ? **Settings** ? Scroll to **"Deploy Hook"** ? Copy the URL.

### 2. Railway Production Deployment
- **`RAILWAY_TOKEN`**
  * **Where to get:** Railway Dashboard ? Click your Profile / Account Settings ? **Tokens** ? Create & Copy Token.
- **`RAILWAY_SERVICE`** *(Optional)*
  * The exact name of your backend service on Railway (e.g., `backend` or `api`).

### 3. Vercel Deployments (Dev Preview & Production)
- **`VERCEL_TOKEN`**
  * **Where to get:** Vercel Dashboard ? Account Settings ? **Tokens** ? Create a token.
- **`VERCEL_ORG_ID`** & **`VERCEL_PROJECT_ID`**
  * Run `npx vercel link` in the `frontend` folder OR in Vercel Project Settings ? General.

---

## ?? Part 2: Environment Variables Configuration

Set these environment variables inside each respective cloud dashboard:

### A. Render Dashboard (Development Backend)
Go to: **Render ? Your Service ? Environment Variables**
```env
NODE_ENV=development
PORT=10000
DATABASE_URL=postgresql://<dev_user>:<dev_pass>@<dev_host>:5432/<dev_db>
JWT_SECRET=ezzysync_dev_secret_key_2026
APP_URL=https://<your-vercel-dev-domain>.vercel.app

# RAZORPAY TEST KEYS
RAZORPAY_KEY_ID=rzp_test_TVVGy1XT8uURcp
RAZORPAY_KEY_SECRET=KbJBQQlMeHEIWDXCehPPYIw1
RAZORPAY_WEBHOOK_SECRET=ezzy_dev_webhook_2026
```

---

### B. Railway Dashboard (Production Backend)
Go to: **Railway ? Backend Service ? Variables**
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://<prod_user>:<prod_pass>@<prod_host>:5432/<prod_db>
JWT_SECRET=ezzysync_prod_super_secure_secret_jwt_2026
APP_URL=https://app.ezzysync.com

# RAZORPAY PRODUCTION KEYS (or Test Keys during staging)
RAZORPAY_KEY_ID=rzp_test_TVVGy1XT8uURcp
RAZORPAY_KEY_SECRET=KbJBQQlMeHEIWDXCehPPYIw1
RAZORPAY_WEBHOOK_SECRET=ezzy_prod_webhook_2026
```

---

### C. Vercel Dashboard (Frontend - Development & Production)
Go to: **Vercel ? Project ? Settings ? Environment Variables**

| Variable Name | Value for **Production** | Value for **Preview / Development** |
| :--- | :--- | :--- |
| **`VITE_RAZORPAY_KEY_ID`** | `rzp_live_...` (or `rzp_test_TVVGy1XT8uURcp`) | `rzp_test_TVVGy1XT8uURcp` |
| **`VITE_API_BASE_URL`** | `https://api.ezzysync.com/api` (Railway Backend) | `https://<render-backend-url>.onrender.com/api` |
| **`VITE_TRIAL_DAYS`** | `30` | `30` |

---

## ?? Daily Developer Workflow (Single-Command Deploy)

### To Deploy to Development (Render + Vercel Preview):
```bash
git checkout dev
git add .
git commit -m "feat: your update"
git push origin dev
```
*(GitHub Actions will instantly test, build, and deploy to Render & Vercel Dev automatically!)*

### To Deploy to Production (Railway + Vercel Production):
```bash
git checkout main
git merge dev
git push origin main
```
*(GitHub Actions will run full production checks and deploy to Railway & Vercel Production!)*
