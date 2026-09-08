# Template: Makefile
#
# `make build` is what produces the single distributable dist/<binary> file.
# `make dev` is for iterating on CLI-only commands (no Wails involved at
# all). `make dev-gui` is separate because iterating on the GUI needs
# `wails dev`, not `go run .` — see wails-facts.md fact #7 for why
# `-appargs "config"` is required: `wails dev` runs the binary with no
# arguments by default, which would hit the bare root command, not the GUI
# command, if we didn't pass the subcommand through explicitly.

BINARY := mycom
DIST   := dist/$(BINARY)

.PHONY: dev dev-gui build test fmt vet clean

dev:
	go run . --help

dev-gui:
	wails dev -appargs "config"

build:
	wails build -clean -trimpath
	mkdir -p dist
	cp build/bin/$(BINARY) $(DIST)

test:
	go test ./...

fmt:
	gofmt -l .

vet:
	go vet ./...

clean:
	rm -rf build dist
