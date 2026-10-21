# Putting this project on GitHub

The repository has about 130 files and no file is larger than 1 MB. GitHub's browser upload accepts 100 files at a time, so with the browser (option B) upload `src/` and the rest in two batches, or just use Git (option A).

Do **not** upload `node_modules/` or `dist/`. They are created on your computer by `npm install` and `npm run build`, and `.gitignore` already excludes them when you use Git.

## Step 1: create an empty repository
1. On github.com, click **New repository**.
2. Name it, for example `skipper-cricket-manager`.
3. Choose **Private** (see "Keep it private" at the end).
4. Leave "Add a README", ".gitignore" and "license" **unticked**. This folder already has its own files, and an initialised repo makes the first push harder.
5. Click **Create repository**.

## Step 2, option A: upload with Git (best; needs a computer)
```bash
unzip skipper-cricket-manager.zip
cd skipper-cricket-manager
git init
git add .
git commit -m "Skipper 1.1.0 (React)"
git branch -M main
git remote add origin https://github.com/<your-username>/skipper-cricket-manager.git
git push -u origin main
```
- GitHub doesn't accept your account password here.
  - Sign in with GitHub CLI (`gh auth login`) first, or
  - Use a personal access token as the password: GitHub → Settings → Developer settings → Personal access tokens.
- Check that `git status` is clean afterwards and the files show on github.com.

## Step 2, option B: upload in the browser (computer)
1. Unzip `skipper-cricket-manager.zip`.
2. On the empty repo page, click **uploading an existing file**.
3. Open the unzipped `skipper-cricket-manager` folder. Select **everything inside it** (folders and files) and drag it onto the page. Chrome and Edge keep the folder structure. If GitHub stops at 100 files, commit, then use **Add file → Upload files** for the rest (keep the folder structure).
4. Write a commit message such as "Skipper 1.1.0" and click **Commit changes**.
5. Check that `.gitignore` and `.gitattributes` arrived. Some file managers hide files that start with a dot.
   - If they are missing, use **Add file → Create new file**, name it `.gitignore`, and paste in the contents from the zip.
   - Then do the same for `.gitattributes`.

## Uploading from a phone only
A phone browser can't upload a whole folder with its structure, so the code arrives as loose files. Two options:
- **Use a computer once** with option A or B. This is the reliable way.
- **Just back up the zip:** in the empty repo, upload `skipper-cricket-manager.zip` as a single file, or attach it to a Release (step 3). The code won't be browsable on GitHub, but it is stored safely.

## Step 3 (optional): add the APK as a Release
1. On the repo page: **Releases → Draft a new release**.
2. Tag: `v1.1.0`. Title: `Skipper 1.1.0`.
3. Attach `releases/Skipper-1.1.0.apk`, then **Publish release**.

## Keep it private
`tools/make_key.py` contains the passphrase that creates the app's signing key. That is what lets future builds install over your current app without losing saves. In a public repo, anyone could build an APK that installs over yours.

## Later: continuing the work with any AI
- Give the AI the repo (or a zip of it) and tell it to read `docs/CONTEXT.md` first.
- Every new APK needs a higher `versionCode` than the last one. 1.1.0 used 3.

## Running it locally after cloning
```bash
npm install
npm run dev      # http://localhost:5173
```
