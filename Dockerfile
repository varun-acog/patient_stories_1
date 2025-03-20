# Use official Node.js 18 LTS as base image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Remove the default CMD
# CMD ["npx", "tsx", "bin/youtube-fetcher.ts", "Diabetes", "-n", "10"]
