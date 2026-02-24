# 1. Use standard Debian-based Go image for better build-time network/DNS stability
FROM golang:1.24 AS builder

WORKDIR /app

# Set Go Proxy explicitly to ensure connectivity
ENV GOPROXY=https://proxy.golang.org,direct
# Increase network timeout for slow connections
ENV GO111MODULE=on

# Copy dependency files first for better caching
COPY go.mod go.sum ./
# Robust download with retries for unstable network
RUN for i in 1 2 3; do go mod download && break || (echo "Download failed, retrying in 5s..." && sleep 5); done

COPY . .

# Build the binary
# CGO_ENABLED=0 is required for the resulting binary to run on Alpine
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# 2. Use a matching or newer Alpine for the runtime
FROM alpine:3.21
WORKDIR /app

# Environment variables
ENV DB_URL=""
ENV JWT_SECRET="dev-secret"

# Copy the binary from the builder stage
COPY --from=builder /app/server /app/server

EXPOSE 8080

CMD ["/app/server"]
