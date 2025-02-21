# Use an official Node.js image with build tools installed
FROM node:16

# Install required dependencies (compilers)
RUN apt-get update && apt-get install -y build-essential gcc g++ python3

# Set the working directory in the container
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your backend runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]
