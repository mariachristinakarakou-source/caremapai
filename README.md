# CareMap AI

CareMap AI is a research proof-of-concept exploring how structured, human-reviewed information may support family caregivers of older adults living in the community.

## Project Overview

The platform helps caregivers organise information about their caregiving situation, review a shared Care Map, identify potential gaps, and explore practical next steps. The current Elena experience is a fictional scenario; it does not call a live AI service or automatically extract facts from free text.

## Core Workflow

1. Initial Input
2. Follow-up Questions and Clarification
3. Review and Confirmation
4. Generated Care Maps
5. Care Needs and Next Steps
6. Care Situation Updates
7. Updated Care Maps
8. Updated Care Needs and Suggested Next Steps
9. Final Care Overview

## Care Map Model

- One structured state stores facts, people, directional relationships, suggested needs, follow-up answers, and history.
- Relationship edits are shared by both SVG Care Map views; prior values are retained in relationship history.
- Facts and needs remain pending until reviewed. Unknown information is not promoted to a confirmed fact.
- Browser speech recognition is offered where supported; text entry remains available.
- Data is stored in local browser storage for this prototype and is not a secure clinical record.

## Key Principles

- Human-in-the-loop interaction
- Caregiver review and confirmation
- Transparency about suggested interpretations and demo limitations
- Privacy and minimal data collection
- Clear distinction between known and unknown information

## Technology

- React
- TypeScript
- Vite

## Local Development

```sh
npm install
npm run dev
```

Run checks with `npm test -- --run`, `npm run build`, and `npm run lint`.

## Project Status

Research prototype. Not clinically validated, does not provide medical advice, and does not verify external services or resources.
