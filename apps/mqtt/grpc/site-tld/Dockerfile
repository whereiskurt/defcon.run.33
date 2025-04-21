# Use official Golang image as the base image
FROM golang:1.24-alpine AS builder

## Deploys the meshtk binary

WORKDIR /app
COPY meshtk/go.mod meshtk/go.sum* ./
RUN go mod download
COPY meshtk/. .
RUN go build -o /meshtk/meshtk cmd/meshtk.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates
COPY --from=builder /meshtk /meshtk
ENV INSPECTOR_HOST="127.0.0.1"
ENV INSPECTOR_PORT="50051"

CMD ["/meshtk/meshtk", "grpc", "security", "--verbose=debug"]