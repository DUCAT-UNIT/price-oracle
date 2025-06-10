# Use the latest Bun image as the base.
FROM oven/bun:latest

# Set the working directory in the container to /app.
WORKDIR /app

# Copy package.json and bun.lockb into the 'app' folder.
COPY ./package.json .
COPY ./bun.lock     .

# Install dependencies using Bun with production flag
RUN bun install

# Copy the repository into the 'app' folder.
COPY . .

# Expose the port the app runs on.
EXPOSE 8082

# Run the application using Bun when the container launches
ENTRYPOINT ["./entrypoint.sh"]
