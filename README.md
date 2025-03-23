Exercise 1: Install Development Tools
This guide provides step-by-step instructions to install essential development tools:

✅ VSCode
✅ NodeJS & npm
✅ MongoDB
✅ Git
✅ MongoDB Compass

1️⃣ Install VSCode
Download from code.visualstudio.com.

Install recommended extensions:

MongoDB for VSCode

2️⃣ Install NodeJS & npm
Download the LTS version from nodejs.org.

Verify installation by running the following commands in the terminal:

node -v
npm -v

3️⃣ Install MongoDB
Step 1: Download & Install
Follow the MongoDB Community Server installation guide.

Download the .msi installer and open it.

Follow the setup instructions and select Complete installation.

Step 2: Configure as a Service (Recommended)

During installation, check ✅ "Run MongoDB as a Service."

This ensures MongoDB starts automatically when your computer starts.

Step 3: Start MongoDB Service

Open Command Prompt as Administrator and run:

net start MongoDB

4️⃣ Install Git

Step 1: Download & Install
Download from git-scm.com.

Open the downloaded .exe file and follow these steps:

Click Next on the welcome screen.

Select components (leave default settings checked).

Adjust PATH environment → Choose:

✅ "Git from the command line and also from 3rd-party software."

Choose a default editor (Recommended: VSCode).

Click Install and wait for the process to complete.

Step 2: Configure Git Username & Email
Run the following commands in the terminal:

git config --global user.name "Your Name"
git config --global user.email "your@email.com"

5️⃣ Install MongoDB Compass
Download from MongoDB Compass.

Open the downloaded .exe file.

Follow the on-screen installation instructions.

Click Install and wait for the process to complete.

Once installed, launch MongoDB Compass.

