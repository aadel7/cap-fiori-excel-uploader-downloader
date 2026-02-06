# ExcelUploaderDownloader

Simple SAP CAP (Node.js) application with a freestyle SAPUI5/Fiori app to **upload and download Excel files**.  
Files are stored in **SAP HANA Cloud** as BLOB/LargeBinary. The backend exposes an **OData V4** service with custom `upload`/`download` endpoints. A local App Router setup is included for running UI + API through one origin.

## Features

- Upload `.xlsx` / `.xls` from UI (base64 → stored as BLOB in HANA)
- List uploaded files (metadata)
- Download stored files back to the client (binary round-trip verified via SHA-256)
- OData V4 service: `/odata/v4/file`
- Local App Router (no-auth mode) to serve UI and proxy API

## Architecture / Project Structure

- `db/`  
  CDS model for persistence (HANA table storing file metadata + binary content)

- `srv/`  
  CAP service definition and handlers:
  - `POST /odata/v4/file/upload` (action): receives base64, stores content as BLOB
  - `GET  /odata/v4/file/download(ID=...)` (function): streams stored content back as binary

- `app/fiori-app/`  
  Freestyle SAPUI5 app (XML view + controller) implementing:
  - upload (via FileUploader + `fetch` to CAP upload action)
  - list (reads `/Files`)
  - download (calls CAP download endpoint, saves blob to disk)

- `app/local-approuter/`  
  Local SAP App Router configuration for development:
  - proxies `/odata/v4/file/**` to CAP service (`http://localhost:4004`)
  - serves the UI from local directory (`../fiori-app/webapp`)

## Prerequisites

- Node.js (LTS recommended)
- npm
- SAP CAP tooling:
  - `@sap/cds-dk` (recommended): `npm i -g @sap/cds-dk`
- Access to SAP HANA Cloud (HDI container) if running against HANA
- (Optional) Cloud Foundry CLI for binding services and deployment

## Install

From repository root:

```bash
npm install
```

If you use the local approuter:

```bash
cd app/local-approuter
npm install
```

## Run locally (recommended dev flow)

### 1) Start CAP backend

From project root:

```bash
cds watch
```

Backend will be available at:

- http://localhost:4004
- Service root: http://localhost:4004/odata/v4/file/

### 2) Start local App Router (UI + API via one origin)

In a second terminal:

```bash
cds bind --exec -- npm start --prefix app/local-approuter
```

Open:

- http://localhost:5000

This loads the UI and forwards API requests to the CAP backend.

## Local App Router configuration (no-auth mode)

### `app/local-approuter/default-env.json`

Defines the destination to the locally running CAP service:

```json
{
  "destinations": [
    {
      "name": "srv-api",
      "url": "http://localhost:4004",
      "forwardAuthToken": false
    }
  ]
}
```

### `app/local-approuter/xs-app.json`

Serves UI and proxies the CAP OData service:

```json
{
  "routes": [
    {
      "source": "^/(.*)$",
      "target": "$1",
      "destination": "srv-api",
      "csrfProtection": false
    }
  ],
  "welcomeFile": "/exceluplaoderdownloaderapp/index.html"
}
```

## API endpoints

Service base path: `/odata/v4/file`

### List files (metadata)

```bash
curl -sS "http://localhost:4004/odata/v4/file/Files"
```

### Upload file (curl)

Assuming you have `test_exceluploaddownload.xlsx` in your current directory:

```bash
FILE_PATH="./test_exceluploaddownload.xlsx"
B64=$(base64 -w 0 "$FILE_PATH")

curl -sS -X POST "http://localhost:4004/odata/v4/file/upload" \
  -H "Content-Type: application/json" \
  -d "{
    \"fileName\": \"test_exceluploaddownload.xlsx\",
    \"mimeType\": \"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\",
    \"contentBase64\": \"$B64\",
    \"note\": \"uploaded via curl\"
  }"
```

### Download file (curl)

```bash
ID="<uuid-from-upload-or-from-Files>"

curl -sS "http://localhost:4004/odata/v4/file/download(ID=$ID)" --output downloaded.xlsx
```

### Verify round-trip integrity

```bash
sha256sum test_exceluploaddownload.xlsx downloaded.xlsx
ls -lh test_exceluploaddownload.xlsx downloaded.xlsx
```

Matching checksums indicate the stored and downloaded content is byte-identical.

## UI behavior

The freestyle UI (View1) provides:

- File selection + optional note
- Upload button (enabled after selecting a file)
- Table listing uploaded files
- Download button per row (downloads via browser)

## Notes on HANA BLOB download

When reading BLOB content from HANA, the driver may return the content as a `Readable` stream rather than a `Buffer`. The backend handler therefore converts the stream to a `Buffer` before sending the response.

## (Optional) Add authentication (XSUAA) - outline

This project can be extended with XSUAA to protect:
- list/view
- upload
- download

Typical steps:

1. Create `xs-security.json` with scopes and role templates.
2. Configure CAP auth in `package.json` (`[production] kind: xsuaa`, `[development] mocked` users).
3. Bind XSUAA instance for Cloud Foundry / deployment.
4. Switch App Router routes to `authenticationType: "xsuaa"` and enable `forwardAuthToken: true`.

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
