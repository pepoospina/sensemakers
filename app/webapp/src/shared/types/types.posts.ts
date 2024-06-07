import { AppUser, FetchParams, PLATFORM } from './types';
import { AppPostSemantics, ParsePostResult } from './types.parser';
import { PlatformPost } from './types.platform.posts';

/**
 * Properties of a post that must be computed in the convertToGeneric method
 */
export interface GenericPostData {
  content: string;
  metadata: {
    originalPlatformAuthor: {
      id: string;
      username: string;
      name: string;
    };
    transcludedContent?: {
      url: string;
      content: string;
      author: {
        id: string;
        username: string;
        name: string;
      };
    }[];
  };
}

/**
 * AppPost object as stored on our database
 *  */
export enum AppPostParsingStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  ERRORED = 'errored',
}
export enum AppPostParsedStatus {
  UNPROCESSED = 'unprocessed',
  PROCESSED = 'processed',
}
export enum AppPostReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  IGNORED = 'ignored',
  DRAFT = 'draft',
  UPDATED = 'updated',
}
export enum AppPostRepublishedStatus {
  PENDING = 'pending',
  REPUBLISHED = 'republished',
}

export interface AppPost extends GenericPostData {
  id: string; // the id may be autogenerated by the DB or computed from an original platform post_id
  authorId: string;
  origin: PLATFORM; // The platform where the post originated
  createdAtMs: number;
  parsingStatus: AppPostParsingStatus;
  parsedStatus: AppPostParsedStatus;
  reviewedStatus: AppPostReviewStatus;
  republishedStatus: AppPostRepublishedStatus;
  originalParsed?: ParsePostResult;
  semantics?: AppPostSemantics;
  mirrorsIds: string[];
}

export type AppPostCreate = Omit<AppPost, 'id'>;

/**
 * Wrapper object that joins an AppPost, all its mirrors and its
 * author profile (including credentials). Useful to transfer publishing
 * information between services
 * */
export interface AppPostFull extends Omit<AppPost, 'mirrorsIds'> {
  mirrors: PlatformPost[];
}

export interface PostAndAuthor {
  post: AppPostFull;
  author: AppUser;
}

/**
 * Payload to mirror a post on other platforms,
 */
export interface AppPostMirror {
  postId: string;
  content?: string;
  semantics?: AppPostSemantics;
  mirrors: PlatformPost[];
}

/**
 * PostUpdate
 */
export type PostUpdate = Partial<
  Pick<
    AppPost,
    | 'content'
    | 'semantics'
    | 'originalParsed'
    | 'parsingStatus'
    | 'parsedStatus'
    | 'reviewedStatus'
    | 'republishedStatus'
  >
>;

export interface PostUpdatePayload {
  postId: string;
  postUpdate: PostUpdate;
}

export enum PostsQueryStatus {
  PUBLISHED = 'published',
  IGNORED = 'ignored',
  PENDING = 'pending',
  ALL = 'all',
}

export interface UserPostsQuery {
  status: PostsQueryStatus;
  fetchParams: FetchParams;
}

export interface ProfilePostsQuery {
  platformId: PLATFORM;
  username: string;
  labelsUris?: string[];
  fetchParams: FetchParams;
}
