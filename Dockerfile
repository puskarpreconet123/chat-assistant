# Build / Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Set node environment
ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code and static files
COPY src ./src
COPY public ./public

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
