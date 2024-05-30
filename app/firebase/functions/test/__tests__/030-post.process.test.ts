import { expect } from 'chai';

import { AppUser, PLATFORM } from '../../src/@shared/types/types';
import {
  PlatformPostDraftApproval,
  PlatformPostPosted,
} from '../../src/@shared/types/types.platform.posts';
import {
  AppPostReviewStatus,
  PostsQueryStatus,
} from '../../src/@shared/types/types.posts';
import { TwitterThread } from '../../src/@shared/types/types.twitter';
import { signNanopublication } from '../../src/@shared/utils/nanopub.sign.util';
import { getRSAKeys } from '../../src/@shared/utils/rsa.keys';
import { logger } from '../../src/instances/logger';
import { TWITTER_USER_ID_MOCKS } from '../../src/platforms/twitter/mock/twitter.service.mock';
import { TwitterService } from '../../src/platforms/twitter/twitter.service';
import { parsePostTask } from '../../src/posts/posts.task';
import { UsersHelper } from '../../src/users/users.helper';
import { resetDB } from '../utils/db';
import { createUsers } from '../utils/users.utils';
import {
  USE_REAL_NANOPUB,
  USE_REAL_PARSER,
  USE_REAL_TWITTER,
  testUsers,
} from './setup';
import { getTestServices } from './test.services';

const DEBUG_PREFIX = `030-process`;
const DEBUG = true;

describe.only('030-process', () => {
  let rsaKeys = getRSAKeys('');

  const services = getTestServices({
    time: 'real',
    twitter: USE_REAL_TWITTER ? 'real' : 'mock-publish',
    nanopub: USE_REAL_NANOPUB ? 'real' : 'mock-publish',
    parser: USE_REAL_PARSER ? 'real' : 'mock',
  });

  before(async () => {
    logger.debug('resetting DB');
    await resetDB();
  });

  describe('create and process', () => {
    let user: AppUser | undefined;
    let thread: PlatformPostPosted<TwitterThread>;

    before(async () => {
      await services.db.run(async (manager) => {
        const users = await createUsers(
          services,
          Array.from(testUsers.values()),
          manager
        );
        if (DEBUG)
          logger.debug(`users crated ${users.length}`, { users }, DEBUG_PREFIX);
        user = users.find(
          (u) =>
            UsersHelper.getAccount(
              u,
              PLATFORM.Twitter,
              TWITTER_USER_ID_MOCKS
            ) !== undefined
        );
        if (DEBUG)
          logger.debug(`test user ${user?.userId}`, { user }, DEBUG_PREFIX);
      });

      /**
       * fetch once to get the posts once and set the fetchedDetails of
       * the account
       */
      await services.db.run(async (manager) => {
        if (!user) throw new Error('user not created');
        /** fetch will store the posts in the DB */
        if (DEBUG) logger.debug(` ${user?.userId}`, { user }, DEBUG_PREFIX);
        await services.postsManager.fetchUser(
          {
            userId: user.userId,
            params: { expectedAmount: 10 },
          },
          manager
        );
      });
    });

    /** skip for now because we have not yet granted write access */
    it('publish a tweet in the name of the test user', async () => {
      await services.db.run(async (manager) => {
        if (!user) {
          throw new Error('user not created');
        }

        const accounts = user[PLATFORM.Twitter];
        if (!accounts) {
          throw new Error('Unexpected');
        }
        const account = accounts[0];
        if (!account) {
          throw new Error('Unexpected');
        }

        const TEST_CONTENT = `This is a test post ${USE_REAL_TWITTER ? Date.now() : ''}`;

        thread = await services.platforms
          .get<TwitterService>(PLATFORM.Twitter)
          .publish(
            {
              draft: { text: TEST_CONTENT },
              userDetails: account,
            },
            manager
          );

        expect(thread).to.not.be.undefined;

        if (USE_REAL_TWITTER) {
          await new Promise<void>((resolve) => setTimeout(resolve, 6 * 1000));
        }
      });
    });

    it('fetch user posts from all platforms', async () => {
      if (!user) {
        throw new Error('user not created');
      }

      /**
       * fetch user posts. This time should return only the
       * newly published post
       */
      await services.postsManager.fetchUser({
        userId: user.userId,
        params: { expectedAmount: 10 },
      });

      /** read user post */
      const postsRead = await services.postsManager.getOfUser(user.userId);

      expect(postsRead).to.not.be.undefined;

      const postRead = postsRead[0];
      expect(postRead).to.not.be.undefined;
      expect(postRead.mirrors).to.have.length(1);

      expect(postRead.semantics).to.be.undefined;
      expect(postRead.originalParsed).to.be.undefined;

      const tweetRead = postRead.mirrors.find(
        (m) => m.platformId === PLATFORM.Twitter
      );

      if (!tweetRead) {
        throw new Error('tweetRead not created');
      }

      if (!user) {
        throw new Error('user not created');
      }

      expect(postRead).to.not.be.undefined;
    });

    it('triggers parse user posts task', async () => {
      if (!user) {
        throw new Error('user not created');
      }

      const posts = await services.postsManager.getOfUser(user.userId, {
        status: PostsQueryStatus.ALL,
        fetchParams: { expectedAmount: 100 },
      });
      await Promise.all(
        posts.map((post) => {
          return parsePostTask({ data: { postId: post.id } } as any);
        })
      );

      /** wait for the task to finish */
      if (USE_REAL_PARSER) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0.5 * 1000));
      }

      const postsRead = await services.postsManager.getOfUser(user.userId);

      expect(postsRead).to.not.be.undefined;

      postsRead.forEach((postRead) => {
        expect(postRead.semantics).to.not.be.undefined;
        expect(postRead.originalParsed).to.not.be.undefined;
        expect(postRead.parsedStatus).to.eq('processed');
      });
    });

    it('approves/publishes pending post', async () => {
      if (!user) {
        throw new Error('user not created');
      }

      /** get pending posts of user */
      const pendingPosts = await services.postsManager.getOfUser(user.userId, {
        status: PostsQueryStatus.PENDING,
        fetchParams: { expectedAmount: 10 },
      });

      if (!USE_REAL_TWITTER) {
        expect(pendingPosts).to.have.length(7);
      }

      await Promise.all(
        pendingPosts.map(async (pendingPost) => {
          const nanopub = pendingPost.mirrors.find(
            (m) => m.platformId === PLATFORM.Nanopub
          );

          if (!nanopub?.draft) {
            throw new Error('draft not created');
          }

          const draft = nanopub.draft.post;

          if (!rsaKeys) {
            throw new Error('rsaKeys undefined');
          }

          /** sign */
          const signed = await signNanopublication(draft, rsaKeys, '');
          nanopub.draft.post = signed.rdf();
          nanopub.draft.postApproval = PlatformPostDraftApproval.APPROVED;

          if (!user) {
            throw new Error('user not created');
          }

          /** send updated post (content and semantics did not changed) */
          await services.postsManager.approvePost(pendingPost, user.userId);

          const approved = await services.postsManager.getPost(
            pendingPost.id,
            true
          );

          expect(approved).to.not.be.undefined;
          expect(approved.reviewedStatus).to.equal(
            AppPostReviewStatus.APPROVED
          );
        })
      );
    });

    it('get user profile', async () => {
      if (!user) {
        throw new Error('user not created');
      }

      const twitter = UsersHelper.getAccount(
        user,
        PLATFORM.Twitter,
        undefined,
        true
      );

      const username = twitter.profile?.username;
      if (!username) {
        throw new Error('username not found in profile');
      }

      const LABELS_URIS = ['https://sense-nets.xyz/asksQuestionAbout'];

      const profilePosts = await services.postsManager.getUserProfile(
        PLATFORM.Twitter,
        username,
        { expectedAmount: 100 },
        LABELS_URIS
      );

      expect(profilePosts).to.not.be.undefined;
      expect(profilePosts).to.have.length(1);

      const LABELS_URIS_2 = [
        'https://sense-nets.xyz/asksQuestionAbout',
        'http://purl.org/spar/cito/discusses',
      ];

      const profilePosts2 = await services.postsManager.getUserProfile(
        PLATFORM.Twitter,
        username,
        { expectedAmount: 100 },
        LABELS_URIS_2
      );

      expect(profilePosts2).to.not.be.undefined;
      expect(profilePosts2).to.have.length(5);
    });
  });
});
