import type { Album, AlbumStats, ReviewTrack } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

function requireApiUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_BASE_URL');
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  requireApiUrl();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-RecordRank-Key': API_KEY } : {}),
      ...options?.headers,
    },
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }

  if (!payload.data) {
    throw new Error('Invalid API response');
  }

  return payload.data;
}

export function createAlbum(input: {
  artist: string;
  title: string;
  tracks: Array<{ title: string }>;
}) {
  return request<Album>('', {
    method: 'POST',
    body: JSON.stringify({ action: 'create_album', ...input }),
  });
}

export function getAlbum(id: string) {
  return request<Album>(`?action=album&id=${encodeURIComponent(id)}`);
}

export function getStats(id: string) {
  return request<AlbumStats>(`?action=stats&id=${encodeURIComponent(id)}`);
}

export function submitReview(input: {
  albumId: string;
  reviewerName: string;
  tracks: ReviewTrack[];
}) {
  return request<{ id: string }>('', {
    method: 'POST',
    body: JSON.stringify({ action: 'submit_review', ...input }),
  });
}
