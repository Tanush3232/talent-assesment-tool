# AWS Lightsail Ubuntu Deployment Guide (Next.js + PostgreSQL + Nginx)

This guide provides step-by-step instructions to pull, build, configure, and deploy your Talent Assessment tool on a fresh AWS Lightsail Ubuntu instance.

---

## Step 1: Connect to your AWS Lightsail Instance
1. Go to your **AWS Lightsail Console**.
2. Click on the **Terminal icon** next to your Ubuntu instance to launch the web-based SSH terminal.

---

## Step 2: System Update & Install Dependencies
Run these commands one by one to update the system and install Node.js, Nginx, and PostgreSQL:

```bash
# Update the package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js (Version 20) and NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx (Web Server) and Git
sudo apt install -y nginx git

# Install PostgreSQL (Database)
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally (Process Manager to keep the app running forever)
sudo npm install -g pm2
```

---

## Step 3: Configure the PostgreSQL Database
We need to create a database user and a database for the app to connect to.

1. **Log into the PostgreSQL prompt:**
```bash
sudo -u postgres psql
```

2. **Run these SQL commands inside the prompt:**
*(Replace `your_secure_password` with a strong password!)*
```sql
CREATE DATABASE talent_db;
CREATE USER talent_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE talent_db TO talent_admin;
ALTER DATABASE talent_db OWNER TO talent_admin;
\q
```
*The `\q` command exits the postgres prompt.*

---

## Step 4: Clone the Repository
Generate an SSH key on your server if you haven't, add it to GitHub, and pull your code.

1. **Generate SSH Key (if you haven't):**
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```
*(Press Enter for all prompts to use the default path and no passphrase).*

2. **View your public key and add it to GitHub:**
```bash
cat ~/.ssh/id_ed25519.pub
```
*(Copy the output, go to GitHub -> Settings -> SSH and GPG keys -> New SSH key -> Paste the key).*

3. **Clone the code into your home directory:**
```bash
cd ~
git clone git@github.com:Tanush3232/talent-assesment-tool.git
cd talent-assesment-tool/talent-portal
```

---

## Step 5: Create and Configure the `.env` File
You need to create a `.env` file in the root of the project (inside the `talent-portal` folder).

1. **Open the nano text editor to create the `.env` file:**
```bash
nano .env
```

2. **Paste the following variables into the file:**
*Right-click to paste in the Lightsail terminal. Replace placeholders with your actual secrets!*

```env
# Database connection string (Change 'your_secure_password' to the one you set in Step 3)
DATABASE_URL="postgresql://talent_admin:your_secure_password@localhost:5432/talent_db?schema=public"

# NextAuth / Auth.js Configuration
AUTH_SECRET="generate_a_random_32_character_string_here"
NEXTAUTH_URL="http://your_domain_or_server_ip"

# Microsoft Entra ID (Azure AD) Credentials
AUTH_MICROSOFT_ENTRA_ID_ID="your_azure_client_id"
AUTH_MICROSOFT_ENTRA_ID_SECRET="your_azure_client_secret"
AUTH_MICROSOFT_ENTRA_ID_TENANT_ID="your_azure_tenant_id"
```

3. **Save and exit nano:**
- Press `Ctrl + O` to save.
- Press `Enter` to confirm the file name.
- Press `Ctrl + X` to exit.

---

## Step 6: Install, Build, and Migrate Database
Now we install packages, push the Prisma schema to the database, and build the Next.js frontend.

```bash
# 1. Install NPM dependencies
npm install

# 2. Push the Prisma schema to PostgreSQL (creates the tables)
npx prisma db push

# 3. Seed the database with Admin, HR, and Managers
npm run db:seed

# 4. Build the Next.js application for production
npm run build
```

---

## Step 7: Start the App with PM2
To keep the app running in the background even if you close the terminal, we use PM2.

```bash
# Start the production server
pm2 start npm --name "talent-portal" -- run start

# Tell PM2 to automatically start the app if the server restarts/reboots
pm2 save
pm2 startup
```
*(When you run `pm2 startup`, it will output a command at the bottom starting with `sudo env PATH...`. **Copy and run that exact command** to enable startup).*

---

## Step 8: Configure Nginx Reverse Proxy
We will use Nginx to route traffic from port 80 (HTTP) to port 3000 (where Next.js is running).

1. **Remove the default Nginx config:**
```bash
sudo rm /etc/nginx/sites-enabled/default
```

2. **Copy the `nginx.conf` file we created in this project to the Nginx config directory:**
```bash
sudo cp ~/talent-assesment-tool/talent-portal/nginx.conf /etc/nginx/sites-available/talent-portal
```

3. *(Optional)* **Edit the Nginx file to add your domain/IP:**
```bash
sudo nano /etc/nginx/sites-available/talent-portal
```
Change `server_name your_domain_or_IP;` to your actual server IP or domain name. Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X`).

4. **Enable the configuration and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/talent-portal /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## Done! 🎉
Your app is now live. Open your browser and navigate to your AWS Lightsail Instance's public IP address.

**Useful Commands for Maintenance:**
* View App Logs: `pm2 logs talent-portal`
* Restart App: `pm2 restart talent-portal`
* Pull new GitHub changes: `git pull origin main`, then `npm run build`, then `pm2 restart talent-portal`
