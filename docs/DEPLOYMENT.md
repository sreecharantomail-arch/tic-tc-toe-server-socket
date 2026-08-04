# 🚀 Production Deployment Guide — NexaClash Server

This document details how to deploy **NexaClash Ultimate Edition** to production environments with real-world security, MongoDB persistence, and WebSocket support.

---

## 🍃 1. MongoDB Atlas Setup (Database)

If your server logs `bad auth : authentication failed` or `MongoServerError`:

1. Log into your [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Go to **Database Access**:
   - Create a new Database User (or edit existing user).
   - Set a strong password (avoid special characters like `@`, `:`, `/` in the password or URL-encode them).
   - Grant role: **Read and write to any database**.
3. Go to **Network Access**:
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud hosts (Render, Railway, AWS) can connect to the database.
4. Copy your Connection String (`mongodb+srv://...`).

---

## ☁️ 2. Deploying on Render.com (Recommended - WebSockets Supported)

[Render](https://render.com) is the easiest platform for deploying Node.js + Socket.io applications.

### Steps:
1. Push your project repository to GitHub or GitLab.
2. Sign in to [Render Console](https://dashboard.render.com) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the following details:
   - **Name:** `nexaclash-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Scroll to **Environment Variables** and add:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `your_random_production_secret_key`
   - `CORS_ORIGIN`: `*` (or your domain)
6. Click **Create Web Service**. Your server will be live with HTTPS and WebSocket (WSS) support automatically!

---

## 🚂 3. Deploying on Railway.app

[Railway](https://railway.app) provides 1-click deployments for Node.js & MongoDB.

1. Connect your GitHub account to Railway.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Go to **Variables** tab and set:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: `your_mongodb_uri`
   - `JWT_SECRET`: `your_secret_key`
   - `CORS_ORIGIN`: `*`
5. Railway automatically detects `package.json` and runs `npm start`.

---

## 🐳 4. Deploying with Docker

You can containerize and run the server anywhere Docker is supported (AWS ECS, GCP Cloud Run, Fly.io, DigitalOcean):

```bash
# Build Docker image
docker build -t nexaclash .

# Run Docker container locally or on server
docker run -d -p 3000:3000 --env-file .env --name nexaclash nexaclash
```

---

## 🖥️ 5. Deploying on VPS (Ubuntu + PM2 + Nginx SSL)

For self-hosted Linux servers:

### Step 1: Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### Step 2: Start Application with PM2
```bash
# Clone project & install dependencies
npm install

# Start cluster with PM2 blueprint
npm run pm2:start

# Enable auto-restart on system reboot
pm2 startup
pm2 save
```

### Step 3: Nginx Reverse Proxy & WebSocket Configuration
Create `/etc/nginx/sites-available/nexaclash`:
```nginx
server {
    server_name nexaclash.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable site & SSL Certificate:
```bash
sudo ln -s /etc/nginx/sites-available/nexaclash /etc/nginx/sites-enabled/
sudo certbot --nginx -d nexaclash.yourdomain.com
```
