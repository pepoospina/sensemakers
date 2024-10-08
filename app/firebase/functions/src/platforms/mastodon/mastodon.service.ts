import { createOAuthAPIClient, createRestAPIClient, mastodon } from 'masto';

import { PlatformFetchParams } from '../../@shared/types/types.fetch';
import {
  MastodonAccountCredentials,
  MastodonAccountDetails,
  MastodonGetContextParams,
  MastodonPost,
  MastodonProfile,
  MastodonSignupContext,
  MastodonSignupData,
  MastodonThread,
} from '../../@shared/types/types.mastodon';
import {
  FetchedResult,
  PlatformPostCreate,
  PlatformPostDraft,
  PlatformPostDraftApproval,
  PlatformPostPosted,
  PlatformPostPublish,
  PlatformPostSignerType,
} from '../../@shared/types/types.platform.posts';
import { PLATFORM } from '../../@shared/types/types.platforms';
import {
  GenericAuthor,
  GenericPost,
  GenericThread,
  PostAndAuthor,
} from '../../@shared/types/types.posts';
import { AccountProfileBase } from '../../@shared/types/types.profiles';
import { AccountCredentials } from '../../@shared/types/types.user';
import { MASTODON_ACCESS_TOKEN } from '../../config/config.runtime';
import { logger } from '../../instances/logger';
import { TimeService } from '../../time/time.service';
import { UsersHelper } from '../../users/users.helper';
import { UsersRepository } from '../../users/users.repository';
import { PlatformService } from '../platforms.interface';
import {
  cleanMastodonContent,
  convertMastodonPostsToThreads,
  extractPrimaryThread,
} from './mastodon.utils';

const DEBUG = true;
const DEBUG_PREFIX = 'MastodonService';

export interface MastodonServiceConfig {
  apiDomain: string;
}

export class MastodonService
  implements
    PlatformService<
      MastodonSignupContext,
      MastodonSignupData,
      MastodonAccountDetails
    >
{
  constructor(
    protected time: TimeService,
    protected usersRepo: UsersRepository,
    protected config: MastodonServiceConfig
  ) {}

  protected async createApp(params: MastodonGetContextParams) {
    if (DEBUG) logger.debug('createApp', { params }, DEBUG_PREFIX);

    const client = createRestAPIClient({
      url: `https://${params.mastodonServer}`,
    });

    const scopes = params.type === 'write' ? 'read write' : 'read';

    const app = await client.v1.apps.create({
      clientName: 'SenseNets',
      redirectUris: params.callback_url,
      scopes,
      website: `https://${params.mastodonServer}`,
    });

    if (DEBUG) logger.debug('createApp result', { app }, DEBUG_PREFIX);

    return app;
  }

  public async getSignupContext(
    userId?: string,
    params?: MastodonGetContextParams
  ): Promise<MastodonSignupContext> {
    if (DEBUG)
      logger.debug('getSignupContext', { userId, params }, DEBUG_PREFIX);

    if (!params || !params.mastodonServer || !params.callback_url) {
      throw new Error('Mastodon server and callback URL are required');
    }

    const app = await this.createApp(params);
    if (!app.clientId || !app.clientSecret) {
      throw new Error('Failed to create Mastodon app');
    }

    const scopes = params.type === 'write' ? 'read+write' : 'read';

    const authorizationUrl =
      `https://${params.mastodonServer}/oauth/authorize?` +
      `client_id=${app.clientId}&` +
      `scope=${scopes}&` +
      `redirect_uri=${params.callback_url}&` +
      `response_type=code`;

    const result = {
      authorizationUrl,
      clientId: app.clientId,
      clientSecret: app.clientSecret,
    };

    if (DEBUG) logger.debug('getSignupContext result', result, DEBUG_PREFIX);

    return result;
  }

  public async handleSignupData(signupData: MastodonSignupData) {
    const token = await (async () => {
      if ('accessToken' in signupData) {
        return { accessToken: signupData.accessToken };
      }
      const client = createOAuthAPIClient({
        url: `https://${signupData.mastodonServer}`,
      });
      return await client.token.create({
        clientId: signupData.clientId,
        clientSecret: signupData.clientSecret,
        redirectUri: signupData.callback_url,
        code: signupData.code,
        grantType: 'authorization_code',
      });
    })();

    if (DEBUG) logger.debug('handleSignupData token', { token }, DEBUG_PREFIX);

    const mastoClient = createRestAPIClient({
      url: `https://${signupData.mastodonServer}`,
      accessToken: token.accessToken,
    });

    const account = await mastoClient.v1.accounts.verifyCredentials();
    const credentials: MastodonAccountCredentials = {
      accessToken: token.accessToken,
    };

    const mastodon: MastodonAccountDetails = {
      user_id: account.id,
      signupDate: this.time.now(),
      credentials: {
        read: credentials,
      },
    };
    if (signupData.type === 'write') {
      mastodon.credentials['write'] = credentials;
    }

    if (DEBUG)
      logger.debug('handleSignupData result', { mastodon }, DEBUG_PREFIX);

    const mdProfile: MastodonProfile = {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      avatar: account.avatar,
      domain: signupData.mastodonServer,
    };

    const profile: AccountProfileBase<MastodonProfile> = {
      user_id: account.id,
      profile: mdProfile,
    };

    return { accountDetails: mastodon, profile };
  }

  public async fetch(
    user_id: string,
    params: PlatformFetchParams,
    credentials: AccountCredentials<
      MastodonAccountCredentials,
      MastodonAccountCredentials
    >
  ): Promise<FetchedResult<MastodonThread>> {
    if (DEBUG) logger.debug('fetch', { params, credentials }, DEBUG_PREFIX);

    if (!credentials.read) {
      throw new Error('profile and/or read credentials are not provided');
    }
    const client = createRestAPIClient({
      url: `https://${credentials.read.domain || this.config.apiDomain}`,
      accessToken: credentials.read.accessToken,
    });

    const fetchParams: any = {
      limit: 40, // Default limit
      excludeReplies: true,
      excludeReblogs: true,
    };

    if (params.since_id) {
      fetchParams.minId = params.since_id;
    }
    if (params.until_id) {
      fetchParams.maxId = params.until_id;
    }

    if (DEBUG) logger.debug('fetch params', { fetchParams }, DEBUG_PREFIX);

    const paginator = client.v1.accounts
      .$select(user_id)
      .statuses.list(fetchParams);

    let allStatuses: MastodonPost[] = [];
    let newestId: string | undefined;
    let oldestId: string | undefined;

    while (true) {
      const result = await paginator.next();
      if (result.done) break;

      const statuses = result.value;
      if (statuses.length === 0) break;

      allStatuses.push(...statuses);

      const sortedStatuses = statuses.sort(
        (a, b) => Number(b.id) - Number(a.id)
      );

      if (!newestId) newestId = sortedStatuses[0].id;
      newestId =
        sortedStatuses[0].id > newestId ? sortedStatuses[0].id : newestId;
      if (!oldestId) oldestId = sortedStatuses[sortedStatuses.length - 1].id;
      oldestId =
        sortedStatuses[sortedStatuses.length - 1].id < oldestId
          ? sortedStatuses[sortedStatuses.length - 1].id
          : oldestId;

      const threads = convertMastodonPostsToThreads(
        allStatuses,
        allStatuses[0].account
      );

      if (DEBUG)
        logger.debug(
          'fetch iteration',
          {
            statusesCount: statuses.length,
            allStatusesCount: allStatuses.length,
            threadsCount: threads.length,
            newestId,
            oldestId,
          },
          DEBUG_PREFIX
        );

      if (threads.length >= params.expectedAmount) {
        break;
      }
    }
    if (allStatuses.length === 0) {
      if (DEBUG) logger.debug('fetch no statuses found', {}, DEBUG_PREFIX);
      return {
        fetched: {
          newest_id: undefined,
          oldest_id: undefined,
        },
        platformPosts: [],
      };
    }

    const threads = convertMastodonPostsToThreads(
      allStatuses,
      allStatuses[0].account
    );

    const platformPosts = threads.map((thread) => ({
      post_id: thread.thread_id,
      user_id: thread.author.id,
      timestampMs: new Date(thread.posts[0].createdAt).getTime(),
      post: thread,
    }));

    const result = {
      fetched: {
        newest_id: newestId,
        oldest_id: oldestId,
      },
      platformPosts,
    };

    if (DEBUG)
      logger.debug(
        'fetch result',
        {
          newestId,
          oldestId,
          platformPostsCount: platformPosts.length,
        },
        DEBUG_PREFIX
      );

    return result;
  }

  public async convertToGeneric(
    platformPost: PlatformPostCreate<MastodonThread>
  ): Promise<GenericThread> {
    if (!platformPost.posted) {
      throw new Error('Unexpected undefined posted');
    }

    const thread = platformPost.posted.post;
    const genericAuthor: GenericAuthor = {
      platformId: PLATFORM.Mastodon,
      id: thread.author.id,
      username: thread.author.username,
      name: thread.author.displayName,
      avatarUrl: thread.author.avatar,
    };

    const genericPosts: GenericPost[] = thread.posts.map((status) => ({
      url: status.url ? status.url : undefined,
      content: cleanMastodonContent(status.content),
    }));

    return {
      author: genericAuthor,
      thread: genericPosts,
    };
  }

  public async publish(
    postPublish: PlatformPostPublish<string>
  ): Promise<{ post: PlatformPostPosted<mastodon.v1.Status> }> {
    const credentials = postPublish.credentials;

    const client = createRestAPIClient({
      url: `https://${credentials.write.domain}`,
      accessToken: credentials.write.accessToken,
    });

    const status = await client.v1.statuses.create({
      status: postPublish.draft,
    });

    const post = {
      post_id: status.id,
      user_id: status.account.id,
      timestampMs: new Date(status.createdAt).getTime(),
      post: status,
    };

    return { post };
  }

  public async convertFromGeneric(
    postAndAuthor: PostAndAuthor
  ): Promise<PlatformPostDraft<string>> {
    const account = UsersHelper.getProfile(
      postAndAuthor.author,
      PLATFORM.Mastodon,
      undefined,
      true
    );
    const content = postAndAuthor.post.generic.thread
      .map((post) => post.content)
      .join('\n\n');
    return {
      user_id: account.user_id,
      signerType: PlatformPostSignerType.DELEGATED,
      postApproval: PlatformPostDraftApproval.PENDING,
      unsignedPost: content,
    };
  }

  public async get(
    post_id: string,
    credentials: AccountCredentials<
      MastodonAccountCredentials,
      MastodonAccountCredentials
    >
  ): Promise<{ platformPost: PlatformPostPosted<MastodonThread> }> {
    if (!credentials.read) {
      throw new Error('read credentials are not provided');
    }

    const client = createRestAPIClient({
      url: `https://${credentials.read.domain}`,
      accessToken: credentials.read.accessToken,
    });

    const context = await client.v1.statuses.$select(post_id).context.fetch();
    const rootStatus = await (async () => {
      if (context.ancestors.length === 0) {
        return await client.v1.statuses.$select(post_id).fetch();
      }

      return context.ancestors.reduce((oldestStatus, currStatus) => {
        return Number(oldestStatus.id) < Number(currStatus.id)
          ? oldestStatus
          : currStatus;
      }, context.ancestors[0]);
    })();

    const contextOfRoot = await client.v1.statuses
      .$select(rootStatus.id)
      .context.fetch();

    const user_id = rootStatus.account.id;

    const thread = this.constructThread(rootStatus, contextOfRoot, user_id);

    const platformPost = {
      post_id: thread.thread_id,
      user_id: thread.author.id,
      timestampMs: new Date(thread.posts[0].createdAt).getTime(),
      post: thread,
    };

    return { platformPost };
  }

  private constructThread(
    status: mastodon.v1.Status,
    context: mastodon.v1.Context,
    userId: string
  ): MastodonThread {
    const allStatuses = [...context.ancestors, status, ...context.descendants];
    const authorStatuses = allStatuses.filter((s) => s.account.id === userId);

    const sortedStatuses = authorStatuses.sort(
      (a, b) => Number(a.id) - Number(b.id)
    );

    const rootStatus = sortedStatuses[0];
    const thread = extractPrimaryThread(rootStatus.id, sortedStatuses);

    return {
      thread_id: rootStatus.id,
      posts: thread,
      author: rootStatus.account,
    };
  }

  public async getAccountByUsername(
    username: string,
    server: string,
    credentials: MastodonAccountCredentials
  ): Promise<MastodonProfile | null> {
    try {
      // TODO: support using a provided server or our default apiDomain
      const client = createRestAPIClient({
        url: `https://${server}`,
        accessToken: credentials.accessToken,
      });

      const account = await client.v1.accounts.lookup({ acct: username });

      if (account) {
        return {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          avatar: account.avatar,
          domain: server,
        };
      }
      return null;
    } catch (e: any) {
      throw new Error(`Error fetching Mastodon account: ${e.message}`);
    }
  }

  public async getProfile(
    user_id: string,
    credentials: MastodonAccountCredentials
  ): Promise<AccountProfileBase<MastodonProfile>> {
    const client = createRestAPIClient({
      url: `https://${credentials.domain || this.config.apiDomain}`,
      accessToken: credentials.accessToken,
    });

    const mdProfile = await client.v1.accounts.$select(user_id).fetch();

    const profile: AccountProfileBase<MastodonProfile> = {
      user_id,
      profile: {
        id: mdProfile.id,
        avatar: mdProfile.avatar,
        displayName: mdProfile.displayName,
        domain: 'placeholder',
        username: mdProfile.username,
      },
    };

    return profile;
  }
}
