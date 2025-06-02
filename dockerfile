# Use the latest Bun image as the base.
FROM oven/bun:latest

# Set the working directory in the container to /app.
WORKDIR /app

# Copy package.json into the 'app' folder.
COPY ./package.json .

# Copy bun.lockb if it exists
RUN if [ -f bun.lock ]; then cp bun.lock .; fi

# Install dependencies using Bun.
RUN bun install

# Copy the repository into the 'app' folder.
COPY . .

# Expose the port the app runs on.
EXPOSE 8082

# Run the application using Bun when the container launches
CMD ["bun", "start"]
