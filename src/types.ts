export type Track = {
  id: string;
  title: string;
};

export type Album = {
  id: string;
  artist: string;
  title: string;
  tracks: Track[];
  createdAt: string;
};

export type ReviewTrack = {
  trackId: string;
  rating: number;
  comment: string;
};

export type Review = {
  id: string;
  albumId: string;
  reviewerName: string;
  tracks: ReviewTrack[];
  submittedAt: string;
};

export type TrackStat = Track & {
  average: number;
  votes: number;
  comments: number;
};

export type AlbumStats = {
  album: Album;
  rankedTracks: TrackStat[];
  reviews: Review[];
};
