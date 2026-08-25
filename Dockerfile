# Build / Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Set node environment
ENV NODE_ENV=production

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application source code and static files
COPY src ./src
COPY public ./public

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
