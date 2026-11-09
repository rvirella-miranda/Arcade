# Answer Arcade

Students answer your questions to earn play time in six arcade-style games (Maze Muncher, Ring Rush, Block Stack, Snake, Brick Breaker, Sproutish). Students just type their name and pick a question set (no accounts or sign-in). Each question set has its own live leaderboard, and every run is saved so you can see each student's scores, accuracy, and the exact questions they missed.

- `index.html` is the whole site: the student arcade, plus your dashboard behind the **Teacher** button at the top right. Embed this one page in Google Sites.
- The dashboard is protected by Google sign-in. Students who click **Teacher** just see a sign-in screen.
- `teacher.html` only forwards to the dashboard, so old bookmarks keep working.

The site works right away in **demo mode**: data stays in your own browser. Follow the steps below to connect Firebase so data is shared and saved.

---

## 1. Put the files on GitHub Pages (about 5 minutes)

1. Sign in at github.com and click **New repository**. Name it `answer-arcade`, make it **Public**, and click **Create repository**.
2. On the new repo page, click **uploading an existing file**. Drag in **everything inside this folder** (`index.html`, `teacher.html`, `README.md`, `firestore.rules`, and the `css` and `js` folders). Click **Commit changes**.
3. Go to **Settings → Pages**. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder **/(root)**, and click **Save**.
4. After about a minute your site is live at `https://YOUR-GITHUB-NAME.github.io/answer-arcade/`.

**To update the site later**, open a file on GitHub, click the pencil icon, edit it, and click **Commit changes**. Or use **Add file → Upload files** to replace files. The site refreshes within a minute or two.

## 2. Create the Firebase project (about 10 minutes, free)

1. Go to https://console.firebase.google.com and sign in with your school Google account. Click **Create a project** (Google Analytics isn't needed).
2. **Firestore:** in the left menu choose **Build → Firestore Database → Create database**. Pick a location near you and start in **production mode**.
3. **Sign-in:** choose **Build → Authentication → Get started**. Turn on two providers:
   - **Google**. This is for your teacher sign-in.
4. **Authorized domain:** in **Authentication → Settings → Authorized domains**, click **Add domain** and enter `YOUR-GITHUB-NAME.github.io`.
5. **Rules:** open **Firestore Database → Rules**, delete what's there, paste the whole `firestore.rules` file from this repo, and click **Publish**.
   - The rules already list `r.miranda@ascensionoakpark.com` as the teacher. To add a co-teacher, add their email to the list, in lowercase and in quotes, separated by a comma.
6. **Web app config:** click the gear icon → **Project settings** → **Your apps** → the **</>** (Web) icon. Register an app (any nickname; you don't need Firebase Hosting). Copy the `firebaseConfig` values it shows.

## 3. Connect the site to Firebase

1. On GitHub, open `js/firebase-config.js`, click the pencil icon, and replace the placeholder values with your `firebaseConfig`.
2. If you added co-teachers to the rules, add them to `TEACHER_EMAILS` here too.
3. Click **Commit changes**. After a minute, the "Demo mode" note disappears from both pages.

These config values are meant to be public. Your data is protected by the rules from step 2.5.

## 4. Make a class and add it to Google Sites

1. Open your arcade (on your Google Site or at `https://YOUR-GITHUB-NAME.github.io/answer-arcade/`), click **Teacher** at the top right, and click **Sign in with Google**. If sign-in won't open inside Google Sites, click **Open in a new tab** and sign in there.
2. Go to **Question sets**. Upload an Excel/CSV file or paste your questions, choose the settings, and click **Save question set**. Untick **Students can see this set** to hide an old set from the list.
3. In Google Sites, click **Insert → Embed → By URL** and paste `https://YOUR-GITHUB-NAME.github.io/answer-arcade/`. Choose **Whole page**, insert it, and drag the box taller (about 1100 px) so the games fit.
   - **Tip:** to pre-pick a set, embed `https://YOUR-GITHUB-NAME.github.io/answer-arcade/?code=ABCDE` (the set's code is shown in your list).
4. Students type their **first name and last initial**, pick the question set from the list, and press **Start**. No accounts or sign-in. They click the game screen once so the arrow keys work.

## Question file format

One question per row. Column A is the question, column B is the right answer, columns C–E are optional wrong choices, and column F is optional **Notes** (the notes or lesson students should study, shown under the question number).

| Question | Answer | Wrong 1 | Wrong 2 | Wrong 3 | Notes |
|---|---|---|---|---|---|
| Solve 2x + 5 = 17 | 6 | 11 | 8.5 | 12 | Lesson 2.4 Equations |
| Capital of Canada | Ottawa | | | | |
| First U.S. president | George Washington;Washington | | | | Notes p. 14 |

- A run ends when every question in the class set has been asked once, or when the student reaches the miss limit. Each question is asked only once per run, so scores are fair to compare.
- Each right answer earns **45 seconds** of play, or less if the student loses their life first. When time runs out, the next right answer picks the game up where it stopped. Change this per class with **Play time per right answer** (30, 45, 60 or 90 seconds, or until they lose the life).
- Rows with wrong choices become multiple choice, and rows without them become typed answers. You can change this per class with **Answer style**.
- For typed answers, separate other accepted answers with `;`. Capital letters and extra spaces are ignored.
- From Word or Google Docs, copy and paste lines like `Q: …` and `A: …` (and optional `W: …` wrong answers).
- **Pictures (graphs, shapes):** after loading your questions on the dashboard, click a question's picture box and paste a screenshot (Ctrl+V / Cmd+V), drag an image in, or choose a file. Pictures are shrunk automatically and saved in Firebase (free plan).
- To change a class's questions later, use **Edit questions** on the dashboard. The set's progress and leaderboard stay the same.

## What the dashboard shows

- Totals for each class: students, runs, questions answered, and class accuracy.
- A student table with runs, right and wrong answers, accuracy, best score, and last played. Click a name to see the questions that student missed, what they answered, and every run.
- **Questions to reteach**: every question sorted from lowest percent correct, with the most common wrong answer and who missed it.
- Best scores by game.
- **Download CSV** of every run, to open in Google Sheets or Excel.
- **Reset leaderboard** clears the leaderboard but keeps progress. **Clear progress** deletes the class's saved runs.

## Good to know

- Students are identified by the name they type. Ask them to use the same name every time, such as "Jordan R.". Two students typing the exact same name share one leaderboard entry, but their runs still show separately by date.
- Students can't read each other's answers or change the questions. A determined student could still post a fake high score from the browser's developer tools; their real runs stay in your dashboard.
- Firebase's free plan covers a classroom easily (50,000 reads and 20,000 writes per day).
- Students' names and answers are stored in your Firebase project. Check your school's student-data policy before you use it with a class.
