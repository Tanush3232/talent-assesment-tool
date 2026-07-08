# Ultimate DevOps Guide: Deploying Next.js + PostgreSQL on AWS Lightsail

This guide provides a robust, production-grade deployment process for any Next.js application using PostgreSQL, Prisma, PM2, and Nginx on an AWS Lightsail Ubuntu instance. It is designed to ensure zero data loss, secure database connections, and HTTPS encryption.

## Step 1: Initial Server Setup (Dependencies)
Connect to your AWS Lightsail Ubuntu terminal and install the required software: Node.js (v20), Nginx, PostgreSQL, Git, PM2, and Certbot.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js v20 and NPM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx, Git, PostgreSQL, and Certbot
sudo apt install -y nginx git postgresql postgresql-contrib certbot python3-certbot-nginx

# Install PM2 globally (Process manager)
sudo npm install -g pm2
```

## Step 2: PostgreSQL Database Configuration
Create a secure database and a dedicated user. Avoid using the default `postgres` user for your application.

1. **Log into the PostgreSQL shell:**
```bash
sudo -u postgres psql
```
2. **Execute the following SQL commands:** *(Replace `your_db_name`, `your_user`, and `your_secure_password`)*
```sql
CREATE DATABASE your_db_name;
CREATE USER your_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE your_db_name TO your_user;
ALTER DATABASE your_db_name OWNER TO your_user;
\q
```

## Step 3: Clone the Repository
Generate an SSH key on your server (if using a private repo) and clone your application.

```bash
# Generate SSH key (press Enter for all prompts)
ssh-keygen -t ed25519 -C "server_deploy_key"

# Display the public key. Add this to your GitHub Repository -> Settings -> Deploy Keys
cat ~/.ssh/id_ed25519.pub

# Clone the repository and navigate into it
cd ~
git clone git@github.com:YourUsername/YourRepo.git
cd YourRepo/project-folder
```
*(Note: If your repository is public, you can simply run `git clone https://github.com/...`)*

## Step 4: Environment Variables (`.env`)
Create your `.env` file in the root of your Next.js project folder.

```bash
nano .env
```
Ensure your `DATABASE_URL` matches the credentials you set in Step 2. Example:
```env
# Database Connection
DATABASE_URL="postgresql://your_user:your_secure_password@localhost:5432/your_db_name?schema=public"

# NextAuth / Next.js Setup
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate_a_random_string_using_openssl"
```
*Save and exit nano (`Ctrl + O`, `Enter`, `Ctrl + X`).*

## Step 5: Install Dependencies & Prisma Setup (CRITICAL)
This is where we install packages, generate the Prisma client, and apply database migrations safely.

```bash
# 1. Install Node modules
npm install

# 2. Generate Prisma Client (Crucial step to prevent Next.js build errors!)
npx prisma generate

# 3. Apply Database Changes
# IMPORTANT: For PRODUCTION, always use `migrate deploy` to apply migrations safely without dropping data.
# NEVER use `prisma migrate dev` on a production server as it drops tables and resets the database!
npx prisma migrate deploy

# Alternative: If this is the absolute first time setting up the database and you have no migrations folder yet, you can use:
# npx prisma db push
```

## Step 6: Build and Start the Application
Build the Next.js production payload and use PM2 to keep it alive.

```bash
# 1. Build the Next.js app
npm run build

# 2. Start the application with PM2
pm2 start npm --name "my-nextjs-app" -- run start

# 3. Save the PM2 process list and configure it to start on server reboot
pm2 save
pm2 startup
```
*(When you run `pm2 startup`, it will output a command at the bottom starting with `sudo env PATH...`. **Copy and run that exact command**).*

## Step 7: Nginx Reverse Proxy Setup
Configure Nginx to listen on port 80 and forward traffic to your Next.js app on port 3000.

1. **Remove default config and create a new one:**
```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/my-app
```
2. **Paste the following configuration:** *(Change `yourdomain.com`)*
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
3. **Enable the site, test syntax, and restart:**
```bash
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 8: Install SSL/TLS Certificate (HTTPS)
Secure your site with a free Let's Encrypt certificate using Certbot.

```bash
# Request and install the certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
*When prompted, choose Option 2 to Redirect all HTTP traffic to HTTPS.*

---

## 🛠️ Routine Maintenance & Updates
When you make changes to your code locally and push to GitHub, follow this exact sequence on your server to update your live site without data loss:

```bash
cd ~/YourRepo/project-folder
git pull origin main
npm install

# Always generate the client and apply migrations safely
npx prisma generate
npx prisma migrate deploy

# Rebuild the app and restart PM2
npm run build
pm2 restart my-nextjs-app
```
