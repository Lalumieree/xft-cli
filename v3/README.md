# xft-openapi-caller

`xft-openapi-caller` is a Node.js CLI package for matching XFT OpenAPI documents, fetching cached docs, resolving city codes, and calling XFT APIs.

## Install

```bash
npm install -g xft-openapi-caller
```

## Commands

```bash
xft-find-doc --help
xft-fetch-docs --help
xft-call-api --help
xft-refresh-city-cache --help
xft-resolve-city-code --help
```

## Notes

- `keytar` is a required runtime dependency and is installed through npm.
- Sensitive credentials are stored in `~/.xft_config/credentials.json.enc`.
- Non-sensitive config is stored in `~/.xft_config/config.json`.
- City cache files are stored in `~/.xft_config/.cache`.
