# SIH-Aligned Dynamic Student Hackathon Project Repository (Phase 1)

A centralized web application platform built with **Next.js 14+ (App Router)**, **Tailwind CSS**, and **Firebase** (Auth, Cloud Firestore, Firebase Storage).

---

## 🚀 Phase 1 Delivered Features

1. **Scaffolded Next.js App Router + Tailwind CSS Project**.
2. **Firebase SDK Setup**:
   - `src/lib/firebase/client.ts` - Client SDK initialized for Auth, Firestore, & Storage.
   - `src/lib/firebase/admin.ts` - Server-side Admin SDK helper.
   - `.env.local.example` - Config template for environment variables.
3. **TypeScript Data Models** (`src/types/database.ts`):
   - `UserProfile`: `uid`, `name`, `email`, `role`, `approved`, `createdAt`
   - `Project`: `id`, `title`, `abstract`, `description`, `githubLink`, `fileUrls`, `techTags`, `sihDomain`, `embedding`, `ownerId`, `createdAt`
   - `Review`: `id`, `projectId`, `teacherId`, `comment`, `score`, `createdAt`
   - `SihDomain`: `id`, `name`, `description`
4. **Firebase Authentication System**:
   - Email/Password sign up & login
   - Google Sign-In support
   - Automatic creation of user profiles in Firestore `users/{uid}`
   - Default role assigned on sign-up (`student` or `teacher` with `approved: false` pending admin approval).
5. **Role-Based Routing & Dashboards**:
   - `/dashboard/student` - Student hub for project submission & review tracking.
   - `/dashboard/teacher` - Evaluator portal for scoring projects and leaving feedback (with warning for unapproved teachers).
   - `/dashboard/admin` - Admin control panel for approving teacher accounts, managing SIH domains, and viewing analytics.
   - `ProtectedRoute` guard ensuring users are redirected to their appropriate role dashboard.
6. **Firestore Security Rules** (`firestore.rules`):
   - Granular RBAC enforcing access permissions for students, teachers, and admins.

---

## 🛠️ Local Development Setup Instructions

### 1. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Firebase project credentials from the Firebase Console (*Project Settings -> General -> Your Apps*):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Roles in Developer Mode

The application includes an instant **Dev Switch Role** selector on the navigation bar and **Instant Demo Buttons** on the sign-in card. This allows you to test all 3 role perspectives immediately out-of-the-box:

- **Student View**: Click **"As Student"** to test project submissions and view evaluated score cards.
- **Teacher View (Unapproved)**: Click **"As Teacher (Pending)"** to see the warning banner restricting review submissions until approved.
- **Teacher View (Approved)**: Click **"As Teacher (Approved)"** to test evaluating projects, scoring, and leaving comments.
- **Admin View**: Click **"As Admin"** to access user management, toggle teacher approval statuses, add new SIH domains, and inspect platform metrics.

---

## 🔑 First Admin Setup

To establish the initial Admin account for production or live testing:

1. **Create Initial User Account**:
   - Register the admin email through Firebase Authentication (or sign in with Google once).
2. **Open Firebase Console**:
   - Go to **Firebase Console -> Firestore Database**.
3. **Locate or Create User Document**:
   - Navigate to the `users` collection and find the document matching your admin UID (`users/{adminUid}`).
4. **Set Admin Privileges**:
   - Set/update the following fields on the document:
     ```json
     {
       "role": "admin",
       "approved": true
     }
     ```
5. **Configure Server-Side Admin SDK**:
   - Go to **Firebase Console -> Project Settings -> Service accounts**.
   - Click **Generate new private key** and download the JSON key file.
   - Paste the contents of the service account JSON into `.env.local`:
     ```env
     FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
     ```
6. **Security Precautions**:
   - Never commit your service account key file or `FIREBASE_SERVICE_ACCOUNT_KEY` string to source control.
   - Credentials are listed in `.gitignore` to prevent accidental commits.

