# AI Resume Analyzer

A front-end Angular application for the AI Resume Analyzer assignment. Users can upload a resume, optionally add a job description, and receive structured AI feedback.

## Features

- Resume upload form with PDF / DOC / DOCX support
- Optional job description input
- Resume analysis result screen with:
  - overall score
  - profile summary
  - strengths
  - weaknesses
  - missing skills
  - suggestions
  - job comparison summary
- Download analysis report as PDF
- Validation for file type and file size
- User-friendly card-based UI built with Bootstrap

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the application:

```bash
npm start
```

3. Open the browser at:

```text
http://localhost:4200/
```

## Backend requirements

This front-end expects a backend API at `https://localhost:7157/api/resume/analyze`.
The Angular dev server proxy is configured in `proxy.conf.json` to forward `/api` requests to that backend.

If the backend is not running, the UI will still display the upload form, but analysis requests will fail.

## Architecture

- `src/app/app.ts` - root standalone application component
- `src/app/resume-upload/resume-upload.ts` - resume upload and analysis component logic
- `src/app/resume-upload/resume-upload.html` - analysis form and result template
- `src/app/resume-upload/resume-upload.css` - form and card styling
- `proxy.conf.json` - proxy configuration for local backend API requests

## AI usage

This repository implements the front-end experience only. The backend should handle:

- resume text extraction from PDF / DOC / DOCX
- AI model invocation
- returning structured JSON results

### Suggested AI prompt structure

```text
Analyze the resume text and return a JSON response with:
- score (0-100)
- summary
- strengths
- weaknesses
- missingSkills
- suggestions
- jobSummary
```

## Assumptions

- The backend is responsible for extracting text and calling an AI model.
- The frontend only handles upload, validation, result display, and PDF export.

## Improvements possible with more time

- integrate the backend AI service directly in this repository
- implement resume parsing on the client with a library like `pdf.js`
- add keyword highlighting and section-level scoring
- add better loading and retry states
- add unit tests for the component logic
