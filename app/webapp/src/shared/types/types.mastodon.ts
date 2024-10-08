import { mastodon } from 'masto';

import { AccountDetailsBase } from './types.user';

export interface MastodonProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  domain: string;
}

export interface MastodonAccountCredentials {
  domain?: string;
  accessToken: string;
}

export type MastodonAccountDetails = AccountDetailsBase<{
  write?: MastodonAccountCredentials;
  read?: MastodonAccountCredentials;
}>;

export interface MastodonGetContextParams {
  mastodonServer: string;
  callback_url: string;
  type: 'read' | 'write';
}

export interface MastodonSignupContext {
  authorizationUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface MastodonOAuthSignupData extends MastodonGetContextParams {
  code: string;
  clientId: string;
  clientSecret: string;
}

export interface MastodonAccessTokenSignupData {
  mastodonServer: string;
  accessToken: string;
  type: 'read' | 'write';
}

export type MastodonSignupData =
  | MastodonOAuthSignupData
  | MastodonAccessTokenSignupData
  | MastodonGhostSignupData;

export type MastodonGhostSignupData = {
  username: string;
  mastodonServer: string;
  isGhost: true;
};

export interface MastodonThread {
  thread_id: string;
  posts: mastodon.v1.Status[];
  author: MastodonAccount;
}

export type MastodonPost = mastodon.v1.Status;
export type MastodonAccount = mastodon.v1.Account;

// TODO: Not sure what is needed to signin users on tests
export interface MastodonSigninCredentials {}
