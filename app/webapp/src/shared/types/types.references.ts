import { AppPost } from './types.posts';

export interface OEmbed {
  url: string;
  type?: string;
  version?: string;
  title?: string;
  description?: string;
  author?: string;
  author_url?: string;
  provider_name?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
  original_url?: string;
  summary?: string;
  provider_url?: string;
  author_name?: string;
}

export type RefPostData = Pick<
  AppPost,
  'id' | 'authorProfileId' | 'createdAtMs' | 'structuredSemantics'
>;

export interface RefLabel {
  label: string;
  authorProfileId?: string;
}
