# Use official Golang image as the base image
FROM golang:1.22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files (if they exist)
COPY meshtk/go.mod meshtk/go.sum* ./

# Download dependencies (if any)
RUN go mod download

# Copy the source code
COPY meshtk/. .

# Build the application
RUN go build -o /meshtk/meshtk cmd/meshtk.go

# Use a smaller image for the final stage
FROM alpine:latest

# Install CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

# Copy the binary from the builder stage
COPY --from=builder /meshtk /meshtk

# Set environment variables that can be overridden at runtime
ENV INSPECTOR_HOST="127.0.0.1"
ENV INSPECTOR_PORT="50051"

# Set the working directory
WORKDIR /meshtk

# Command to run when the container starts
CMD ["/meshtk/meshtk"]