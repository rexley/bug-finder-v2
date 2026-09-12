# Bug Finder v2

Camera-based insect-like target screening, made with Elliott. Built from rexley/bug-finder.

## Changes
- No colored motion boxes. Red requires two strong AI checks tied to the same tracked target, with a 0.90 model-score threshold and 0.70 margin over alternatives.
- Discards results when targets change, camera shakes, scanning pauses, or the camera switches.
- Bounded portrait/landscape crops, center/photo inspection, pause/resume, supported torch controls, and photo export.
- iOS Home Screen manifest, PNG icons, standalone layout, and cached app shell.

AI scores are relative model scores, not calibrated probabilities. Repeated checks are correlated and are not proof of a bug. Conservative thresholds can miss insects. Real-world accuracy and iPhone camera performance still require device testing. No species or infestation diagnosis is provided.

## Use
Serve `dist/` over HTTPS (localhost also works for development). Open in Safari on iPhone, then Share → Add to Home Screen → Open as Web App → Add. Allow camera access. The AI model downloads from Hugging Face using Transformers.js from jsDelivr; inference and images remain in the browser. Cached assets may be removed by iOS, so offline AI availability is not guaranteed.

Run `npm test` for detector regression checks. Browser/device integration testing is still required; the available automated browser could not launch in the build environment.

Deploy `dist/` as static files. Sites configuration is in `.openai/hosting.json`.
