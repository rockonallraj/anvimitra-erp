# School Branding Asset System

Each onboarded school can customize its mobile client appearance by uploading:
1. `branding/{schoolCode}.json` containing custom color palettes, URLs, and school identity.
2. `branding/{schoolCode}-logo.svg` (or png) for dynamic header and icon theming.

The mobile app loads branding at bootstrap via `/api/public/school-config?schoolCode={code}`.
