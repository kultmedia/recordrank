<?php

// Copy this file to config.php on your server and set a long random value.
// config.php is ignored by git.
const RECORDRANK_API_KEY = 'replace-me';

// Restrict this to your GitHub Pages origin in production, for example:
// const RECORDRANK_ALLOWED_ORIGIN = 'https://your-user.github.io';
// If your web server already sends Access-Control-Allow-Origin, set this to
// null to avoid duplicate origin headers. The API will still send the allowed
// methods and headers needed for preflight requests.
// const RECORDRANK_ALLOWED_ORIGIN = null;
const RECORDRANK_ALLOWED_ORIGIN = '*';
