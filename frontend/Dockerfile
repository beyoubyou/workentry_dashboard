# Use an official nginx image to serve static files
FROM nginx:alpine

# Set the working directory in the container
WORKDIR /usr/share/nginx/html

# Copy your HTML and static files into the working directory
COPY . .

# Expose port 80 to serve the website
EXPOSE 80

# Command to run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
