FROM golang:1.22-alpine AS builder
WORKDIR /src

COPY go.mod ./
COPY main.go store.go scoring.go detection.go handlers.go sessions.go ./
COPY templates/ ./templates/
COPY static/ ./static/

RUN CGO_ENABLED=0 go build -o /out/reviewring .

FROM scratch
COPY --from=builder /out/reviewring /reviewring

EXPOSE 8080
ENTRYPOINT ["/reviewring"]
