.PHONY: all clean fmt vet test client backend

BACKEND_FILES := $(shell find backend -type f -name "*.go")
CLIENT_FILES := $(shell find client -type f -name "*.go")

all: fmt vet test backend client

client: proto/signature.pb.go $(CLIENT_FILES) go.mod
	go build -o build/client ./cmd/client/

backend: proto/signature.pb.go $(BACKEND_FILES) go.mod
	go build -o build/backend ./cmd/backend/

proto/signature.pb.go: proto/signature.proto
	protoc --go_out=paths=source_relative:. proto/signature.proto

clean:
	rm -f build/*

fmt:
	go fmt $$(go list ./...)

vet:
	go vet ./...

test:
	go test -v ./...