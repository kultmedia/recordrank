<?php

declare(strict_types=1);

$configFile = __DIR__ . '/config.php';
if (is_file($configFile)) {
    require $configFile;
}

if (!defined('RECORDRANK_API_KEY')) {
    define('RECORDRANK_API_KEY', '');
}
if (!defined('RECORDRANK_ALLOWED_ORIGIN')) {
    define('RECORDRANK_ALLOWED_ORIGIN', '*');
}

if (RECORDRANK_ALLOWED_ORIGIN !== null && RECORDRANK_ALLOWED_ORIGIN !== '') {
    header('Access-Control-Allow-Origin: ' . RECORDRANK_ALLOWED_ORIGIN);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-RecordRank-Key');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const DATA_DIR = __DIR__ . '/data';
const ALBUM_DIR = DATA_DIR . '/albums';
const REVIEW_DIR = DATA_DIR . '/reviews';

ensureStorage();

try {
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        handleGet();
    } elseif ($method === 'POST') {
        requireApiKey();
        handlePost();
    } else {
        fail('Method not allowed', 405);
    }
} catch (Throwable $error) {
    fail($error->getMessage(), 500);
}

function handleGet(): void
{
    $action = $_GET['action'] ?? '';
    $id = sanitizeId($_GET['id'] ?? '');

    if ($action === 'album') {
        respond(readAlbum($id));
    }

    if ($action === 'stats') {
        $album = readAlbum($id);
        $reviews = readReviews($id);
        respond([
            'album' => $album,
            'rankedTracks' => buildTrackStats($album, $reviews),
            'reviews' => normalizeReviewsForAlbum($album, $reviews),
        ]);
    }

    fail('Unknown action', 400);
}

function handlePost(): void
{
    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($input)) {
        fail('Invalid JSON body', 400);
    }

    $action = $input['action'] ?? '';
    if ($action === 'create_album') {
        createAlbum($input);
    }

    if ($action === 'submit_review') {
        submitReview($input);
    }

    fail('Unknown action', 400);
}

function createAlbum(array $input): void
{
    $artist = trim((string)($input['artist'] ?? ''));
    $title = trim((string)($input['title'] ?? ''));
    $tracksInput = $input['tracks'] ?? [];

    if ($artist === '' || $title === '' || !is_array($tracksInput)) {
        fail('Artist, title, and tracks are required', 400);
    }

    $tracks = [];
    foreach ($tracksInput as $index => $track) {
        $trackTitle = trim((string)($track['title'] ?? ''));
        if ($trackTitle !== '') {
            $tracks[] = [
                'id' => 't' . ((int)$index + 1) . '-' . bin2hex(random_bytes(3)),
                'title' => $trackTitle,
            ];
        }
    }

    if (count($tracks) < 1) {
        fail('At least one track is required', 400);
    }

    $album = [
        'id' => makeId(),
        'artist' => $artist,
        'title' => $title,
        'tracks' => $tracks,
        'createdAt' => gmdate('c'),
    ];

    writeJson(albumPath($album['id']), $album);
    writeJson(reviewPath($album['id']), []);
    respond($album, 201);
}

function submitReview(array $input): void
{
    $albumId = sanitizeId($input['albumId'] ?? '');
    $album = readAlbum($albumId);
    $reviewerName = trim((string)($input['reviewerName'] ?? ''));
    $tracksInput = $input['tracks'] ?? [];

    if ($reviewerName === '' || !is_array($tracksInput)) {
        fail('Reviewer name and tracks are required', 400);
    }

    $validTrackIds = array_column($album['tracks'], 'id');
    $ratingsByTrack = [];

    foreach ($tracksInput as $track) {
        $trackId = (string)($track['trackId'] ?? '');
        $rating = (int)($track['rating'] ?? 0);
        if (!in_array($trackId, $validTrackIds, true) || $rating < 1 || $rating > 10) {
            fail('Every album track needs a rating from 1 to 10', 400);
        }
        $ratingsByTrack[$trackId] = [
            'trackId' => $trackId,
            'rating' => $rating,
            'comment' => trim((string)($track['comment'] ?? '')),
        ];
    }

    if (count($ratingsByTrack) !== count($validTrackIds)) {
        fail('Every album track needs a rating from 1 to 10', 400);
    }

    $orderedTracks = [];
    foreach ($validTrackIds as $trackId) {
        $orderedTracks[] = $ratingsByTrack[$trackId];
    }

    $reviews = readReviews($albumId);
    $review = [
        'id' => makeId(),
        'albumId' => $albumId,
        'reviewerName' => $reviewerName,
        'tracks' => $orderedTracks,
        'submittedAt' => gmdate('c'),
    ];

    $reviews[] = $review;
    writeJson(reviewPath($albumId), $reviews);
    respond(['id' => $review['id']], 201);
}

function buildTrackStats(array $album, array $reviews): array
{
    $stats = [];
    foreach ($album['tracks'] as $track) {
        $stats[$track['id']] = [
            'id' => $track['id'],
            'title' => $track['title'],
            'average' => 0,
            'votes' => 0,
            'comments' => 0,
            '_total' => 0,
        ];
    }

    foreach ($reviews as $review) {
        foreach (($review['tracks'] ?? []) as $trackReview) {
            $trackId = $trackReview['trackId'] ?? '';
            if (!isset($stats[$trackId])) {
                continue;
            }
            $stats[$trackId]['votes']++;
            $stats[$trackId]['_total'] += (int)$trackReview['rating'];
            if (trim((string)($trackReview['comment'] ?? '')) !== '') {
                $stats[$trackId]['comments']++;
            }
        }
    }

    $ranked = array_values(array_map(function (array $track) {
        $track['average'] = $track['votes'] > 0 ? $track['_total'] / $track['votes'] : 0;
        unset($track['_total']);
        return $track;
    }, $stats));

    usort($ranked, function (array $a, array $b) {
        if ($a['average'] === $b['average']) {
            return $b['votes'] <=> $a['votes'];
        }
        return $b['average'] <=> $a['average'];
    });

    return $ranked;
}

function normalizeReviewsForAlbum(array $album, array $reviews): array
{
    $trackIds = array_column($album['tracks'], 'id');
    return array_map(function (array $review) use ($trackIds) {
        $tracksById = [];
        foreach (($review['tracks'] ?? []) as $track) {
            $tracksById[$track['trackId'] ?? ''] = $track;
        }
        $review['tracks'] = array_values(array_filter(array_map(
            fn(string $trackId) => $tracksById[$trackId] ?? null,
            $trackIds
        )));
        return $review;
    }, $reviews);
}

function requireApiKey(): void
{
    $headers = array_change_key_case(getRequestHeaders(), CASE_LOWER);
    $providedKey = $headers['x-recordrank-key'] ?? '';

    if (RECORDRANK_API_KEY === '' || !hash_equals(RECORDRANK_API_KEY, $providedKey)) {
        fail('Invalid API key', 401);
    }
}

function getRequestHeaders(): array
{
    if (function_exists('getallheaders')) {
        return getallheaders();
    }

    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
            $headers[$name] = $value;
        }
    }
    return $headers;
}

function readAlbum(string $id): array
{
    if ($id === '') {
        fail('Album ID is required', 400);
    }
    $path = albumPath($id);
    if (!is_file($path)) {
        fail('Album not found', 404);
    }
    return readJson($path);
}

function readReviews(string $albumId): array
{
    $path = reviewPath($albumId);
    if (!is_file($path)) {
        return [];
    }
    return readJson($path);
}

function readJson(string $path): array
{
    $data = json_decode(file_get_contents($path) ?: '[]', true);
    if (!is_array($data)) {
        fail('Stored JSON is invalid', 500);
    }
    return $data;
}

function writeJson(string $path, array $data): void
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($path, $json . PHP_EOL, LOCK_EX) === false) {
        fail('Unable to write data', 500);
    }
}

function albumPath(string $id): string
{
    return ALBUM_DIR . '/' . sanitizeId($id) . '.json';
}

function reviewPath(string $id): string
{
    return REVIEW_DIR . '/' . sanitizeId($id) . '.json';
}

function sanitizeId($value): string
{
    return preg_replace('/[^a-zA-Z0-9_-]/', '', (string)$value) ?? '';
}

function makeId(): string
{
    return bin2hex(random_bytes(8));
}

function ensureStorage(): void
{
    foreach ([DATA_DIR, ALBUM_DIR, REVIEW_DIR] as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            fail('Unable to create data directory', 500);
        }
    }
}

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['data' => $data], JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}
