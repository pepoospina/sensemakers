import { PLATFORM, PUBLISHABLE_PLATFORM } from './types.platforms';
import { AppPost } from './types.posts';
import { FetchedDetails } from './types.profiles';
import { AccountCredentials } from './types.user';

/**
 * Platform posts as stored in our DB. A platform post can be in one of these statuses
 * - 'draft': The post has an `id`, a `platformId` value, and a `draft` value.
 * - 'posted': The post has been published on the platform and has a defined `postedStatus`.
 * - 'fetched': The post was fetched from the platform, has a defined `postedStatus`
 * */

/**
 * A PlatformPost is on object that was already stored on our DB
 * */
export enum PlatformPostPublishStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

export enum PlatformPostPublishOrigin {
  FETCHED = 'fetched',
  POSTED = 'posted',
}

export interface PlatformPost<C = any, D = any, P = any> {
  id: string; // Internal id generated by firestore
  postId?: string; // The id of the AppPost. Redundant with mirrorIds on AppPost.
  post_id?: string; // The id of the original platform post
  platformId: PUBLISHABLE_PLATFORM;
  publishStatus: PlatformPostPublishStatus;
  publishOrigin: PlatformPostPublishOrigin;
  posted?: PlatformPostPosted<C, P>;
  draft?: PlatformPostDraft<D>;
  deleteDraft?: PlatformPostDeleteDraft; // a draft of the "delete publication" ready in case it needs to be signed
}

export type PlatformPostCreate<C = any> = Omit<PlatformPost<C>, 'id'>;

/**
 * The PlatformPostPosted status is defined after a PlatformPost
 * has been published to its platform
 */
export interface PlatformPostPosted<C = any, A = any> {
  user_id: string; // The intended user_id when publishing
  post_id: string; // The id of the platform post on the platform
  timestampMs: number; // timestamp in ms
  post: C;
  author?: A;
}

export type PlatformPostSigned<C = any> = C;

export interface FetchedResult<C = any> {
  fetched: FetchedDetails;
  platformPosts: PlatformPostPosted<C>[];
  credentials?: AccountCredentials;
}

/**
 * The PlatformPostDraft status is defined prior to posting a PlatformPost
 */
export enum PlatformPostDraftApproval {
  PENDING = 'pending',
  APPROVED = 'approved',
}

export enum PlatformPostSignerType {
  USER = 'user',
  DELEGATED = 'delegated',
}

export interface PlatformPostDraft<D = any> {
  user_id: string; // The intended user_id of when publishing
  postApproval: PlatformPostDraftApproval;
  signerType?: PlatformPostSignerType;
  unsignedPost?: D;
  signedPost?: D;
}

export interface PlatformPostDeleteDraft<D = any>
  extends PlatformPostDraft<D> {}

/**
 * The PlatformPostPublish object is used to publish a post on a platform
 * */
export interface PlatformPostPublish<D = any, C = any> {
  draft: D;
  credentials: AccountCredentials<C>;
}

export interface PlatformPostUpdate<D = any> extends PlatformPostPublish<D> {
  post_id: string;
}

export type PerPlatformPublish = Map<PLATFORM, PlatformPostPublish[]>;

export interface PlatformPostCreated {
  platformPost: PlatformPost;
  post: AppPost; // In case a post was created
}

export type PlatformPostStatusUpdate = Partial<
  Pick<
    PlatformPost,
    | 'post_id'
    | 'posted'
    | 'publishOrigin'
    | 'publishStatus'
    | 'draft'
    | 'deleteDraft'
  >
>;
