import { MessageCircle, Music2, Plus, Share2, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createAlbum, getAlbum, getStats, submitReview } from './api';
import { parseRoute, type Route } from './router';
import type { Album, AlbumStats, ReviewTrack } from './types';

const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? '';

function getCurrentRoute() {
  return parseRoute(window.location.hash);
}

export function App() {
  const [route, setRoute] = useState<Route>(getCurrentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getCurrentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <Header />
        <div className="flex-1 py-6">
          {route.name === 'home' && <Home />}
          {route.name === 'admin' && <Admin />}
          {route.name === 'album' && <AlbumReview albumId={route.id} />}
          {route.name === 'stats' && <Stats albumId={route.id} />}
        </div>
        <Footer />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
      <a href="#/" className="flex items-center gap-2 text-lg font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-600 text-white">
          <Music2 size={20} />
        </span>
        RecordRank
      </a>
      <nav className="flex items-center gap-2 text-sm">
        <a className="rounded-md px-3 py-2 font-medium text-zinc-700 hover:bg-white" href="#/admin">
          Admin
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-200 py-5 text-center text-sm text-zinc-500">
      Made by{' '}
      <a
        className="font-semibold text-zinc-700 hover:text-emerald-700 hover:underline"
        href="https://kultmedia.com/"
        target="_blank"
        rel="noreferrer"
      >
        Kultmedia
      </a>
    </footer>
  );
}

function Home() {
  return (
    <section className="grid gap-8 py-12 md:grid-cols-[1fr_360px] md:items-center">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Record reviews
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Collect track-by-track rankings for a music record.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
          Create an album, share the review link, then send the stats link around when the votes
          are in.
        </p>
        <a
          href="#/admin"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          <Plus size={18} />
          Create album
        </a>
      </div>
      <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {['Opener', 'Single', 'Deep cut', 'Closer'].map((track, index) => (
            <div key={track} className="flex items-center justify-between rounded-md bg-zinc-50 p-3">
              <div>
                <p className="text-xs text-zinc-500">Track {index + 1}</p>
                <p className="font-medium">{track}</p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-800">
                {(8.8 - index * 0.4).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Admin() {
  const [isAuthed, setIsAuthed] = useState(() => !adminPassword);
  const [password, setPassword] = useState('');
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [tracks, setTracks] = useState([{ title: '' }, { title: '' }, { title: '' }]);
  const [createdAlbum, setCreatedAlbum] = useState<Album | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function login(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password === adminPassword) {
      setIsAuthed(true);
    } else {
      setError('Wrong password.');
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const album = await createAlbum({
        artist: artist.trim(),
        title: title.trim(),
        tracks: tracks.map((track) => ({ title: track.title.trim() })).filter((track) => track.title),
      });
      setCreatedAlbum(album);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create album.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthed) {
    return (
      <Panel title="Admin login">
        <form onSubmit={login} className="max-w-sm space-y-4">
          <Field label="Password">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </Field>
          {error && <Alert>{error}</Alert>}
          <button className="button-primary" type="submit">
            Enter
          </button>
        </form>
      </Panel>
    );
  }

  return (
    <Panel title="Create album">
      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Field label="Artist">
            <input className="input" value={artist} onChange={(event) => setArtist(event.target.value)} required />
          </Field>
          <Field label="Album title">
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-800">Tracklist</label>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setTracks((current) => [...current, { title: '' }])}
              >
                <Plus size={16} />
                Add track
              </button>
            </div>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={index} className="flex gap-2">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-zinc-200 bg-white text-sm font-semibold text-zinc-500">
                    {index + 1}
                  </span>
                  <input
                    className="input"
                    placeholder="Track title"
                    value={track.title}
                    onChange={(event) =>
                      setTracks((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { title: event.target.value } : item,
                        ),
                      )
                    }
                    required={index === 0}
                  />
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Remove track"
                    title="Remove track"
                    onClick={() => setTracks((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={tracks.length <= 1}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {error && <Alert>{error}</Alert>}
          <button className="button-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Creating...' : 'Create album'}
          </button>
        </div>

        <aside className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="font-semibold">Links</h2>
          {createdAlbum ? (
            <div className="mt-4 space-y-3">
              <LinkBox label="Review URL" href={`#/album/${createdAlbum.id}`} />
              <LinkBox label="Stats URL" href={`#/stats/${createdAlbum.id}`} />
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-600">Create an album to generate shareable links.</p>
          )}
        </aside>
      </form>
    </Panel>
  );
}

function AlbumReview({ albumId }: { albumId: string }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const [reviewerName, setReviewerName] = useState('');
  const [tracks, setTracks] = useState<Record<string, ReviewTrack>>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAlbum(albumId)
      .then((loadedAlbum) => {
        setAlbum(loadedAlbum);
        setTracks(
          Object.fromEntries(
            loadedAlbum.tracks.map((track) => [track.id, { trackId: track.id, rating: 0, comment: '' }]),
          ),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load album.'))
      .finally(() => setIsLoading(false));
  }, [albumId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('');

    const values = Object.values(tracks);
    if (!reviewerName.trim()) {
      setError('Add your name before submitting.');
      return;
    }
    if (values.some((track) => track.rating < 1)) {
      setError('Give every track a rating from 1 to 10.');
      return;
    }

    try {
      await submitReview({ albumId, reviewerName: reviewerName.trim(), tracks: values });
      setStatus('Review submitted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit review.');
    }
  }

  if (isLoading) return <Panel title="Loading">Fetching album...</Panel>;
  if (!album) return <Panel title="Album not found">{error}</Panel>;

  return (
    <Panel title={`${album.artist} - ${album.title}`}>
      <form onSubmit={save} className="space-y-5">
        <div className="space-y-3">
          {album.tracks.map((track, index) => (
            <div key={track.id} className="rounded-md border border-zinc-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Track {index + 1}
                  </p>
                  <h2 className="mt-1 font-semibold">{track.title}</h2>
                </div>
                <Rating
                  value={tracks[track.id]?.rating ?? 0}
                  onChange={(rating) =>
                    setTracks((current) => ({
                      ...current,
                      [track.id]: { ...current[track.id], rating },
                    }))
                  }
                />
              </div>
              <label className="mt-4 flex items-start gap-2">
                <MessageCircle className="mt-3 shrink-0 text-zinc-500" size={18} />
                <textarea
                  className="input min-h-20 resize-y"
                  placeholder="Optional comment"
                  value={tracks[track.id]?.comment ?? ''}
                  onChange={(event) =>
                    setTracks((current) => ({
                      ...current,
                      [track.id]: { ...current[track.id], comment: event.target.value },
                    }))
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <Field label="Your name">
          <input className="input" value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
        {status && <Success>{status}</Success>}
        <button className="button-primary" type="submit">
          Submit review
        </button>
      </form>
    </Panel>
  );
}

function Stats({ albumId }: { albumId: string }) {
  const [stats, setStats] = useState<AlbumStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStats(albumId)
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load stats.'));
  }, [albumId]);

  const trackMap = useMemo(() => {
    if (!stats) return new Map<string, string>();
    return new Map(stats.album.tracks.map((track) => [track.id, track.title]));
  }, [stats]);

  if (!stats) return <Panel title="Stats">{error || 'Loading stats...'}</Panel>;

  return (
    <Panel title={`${stats.album.artist} - ${stats.album.title}`}>
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Track ranking</h2>
          <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
            {stats.rankedTracks.map((track, index) => (
              <div
                key={track.id}
                className="grid gap-3 border-b border-zinc-100 p-4 last:border-b-0 sm:grid-cols-[48px_1fr_120px_90px]"
              >
                <span className="font-semibold text-zinc-500">#{index + 1}</span>
                <span className="font-medium">{track.title}</span>
                <span className="text-sm text-zinc-600">{track.votes} votes</span>
                <span className="font-semibold">{track.votes ? track.average.toFixed(2) : '-'}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Reviewers</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.reviews.map((review) => (
              <article key={review.id} className="rounded-md border border-zinc-200 bg-white p-4">
                <h3 className="font-semibold">{review.reviewerName}</h3>
                <div className="mt-4 space-y-3">
                  {review.tracks.map((track) => (
                    <div key={track.trackId} className="rounded-md bg-zinc-50 p-3">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">{trackMap.get(track.trackId) ?? 'Unknown track'}</span>
                        <span className="font-semibold">{track.rating}/10</span>
                      </div>
                      {track.comment && <p className="mt-2 text-sm leading-6 text-zinc-600">{track.comment}</p>}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Panel>
  );
}

function Rating({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
      {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
        <button
          key={rating}
          type="button"
          className={`h-9 w-9 rounded-md border text-sm font-semibold transition ${
            value === rating
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-zinc-200 bg-white text-zinc-700 hover:border-emerald-500'
          }`}
          onClick={() => onChange(rating)}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h1 className="mb-5 text-3xl font-bold">{title}</h1>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-800">{label}</span>
      {children}
    </label>
  );
}

function LinkBox({ label, href }: { label: string; href: string }) {
  const url = `${window.location.origin}${window.location.pathname}${href}`;
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <a className="mt-2 block break-all text-sm font-medium text-emerald-700 hover:underline" href={href}>
        {url}
      </a>
      <button
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-zinc-950"
        type="button"
        onClick={() => navigator.clipboard.writeText(url)}
      >
        <Share2 size={16} />
        Copy
      </button>
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

function Success({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {children}
    </p>
  );
}
