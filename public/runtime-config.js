// Local dev / non-Docker builds: no runtime overrides, app.config.ts falls back to
// VITE_API_BASE_URL or its hardcoded default. The Docker image overwrites this file
// at container startup (see docker/entrypoint.sh) to point at the deployed API host.
window.__RUNTIME_CONFIG__ = window.__RUNTIME_CONFIG__ || {};
