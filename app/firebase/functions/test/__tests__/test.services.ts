import { anything, instance, spy, when } from 'ts-mockito';

import { PLATFORM } from '../../src/@shared/types/types';
import { ParsePostResult } from '../../src/@shared/types/types.parser';
import { DBInstance } from '../../src/db/instance';
import { Services } from '../../src/instances/services';
import { ParserService } from '../../src/parser/parser.service';
import { NanopubService } from '../../src/platforms/nanopub/nanopub.service';
import { OrcidService } from '../../src/platforms/orcid/orcid.service';
import {
  IdentityServicesMap,
  PlatformsMap,
  PlatformsService,
} from '../../src/platforms/platforms.service';
import { TwitterService } from '../../src/platforms/twitter/twitter.service';
import { PlatformPostsRepository } from '../../src/posts/platform.posts.repository';
import { PostsManager } from '../../src/posts/posts.manager';
import { PostsProcessing } from '../../src/posts/posts.processing';
import { PostsRepository } from '../../src/posts/posts.repository';
import { TimeService } from '../../src/time/time.service';
import { UsersRepository } from '../../src/users/users.repository';
import { UsersService } from '../../src/users/users.service';
import { getTwitterMock } from './mocks/twitter.service.mock';
import { MOCK_TWITTER } from './setup';

export const MOCKED_SEMANTICS =
  '<http://example.org/mosquito> <http://example.org/transmits> <http://example.org/malaria> .';

export const MOCKED_PARSER_RESULT: ParsePostResult = {
  post: 'test',
  semantics: MOCKED_SEMANTICS,
};

export const getTestServices = () => {
  const mandatory = ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'];

  mandatory.forEach((varName) => {
    if (!process.env[varName]) {
      throw new Error(
        `${varName} undefined in process.env (derived from .env.test)`
      );
    }
  });

  const db = new DBInstance();
  const userRepo = new UsersRepository(db);
  const postsRepo = new PostsRepository(db);
  const platformPostsRepo = new PlatformPostsRepository(db);

  const identityServices: IdentityServicesMap = new Map();
  const platformsMap: PlatformsMap = new Map();
  const time = new TimeService();
  const MockedTime = spy(new TimeService());

  when(MockedTime.now()).thenReturn(
    /** 3 hours from now so the token will always be invalid */
    Date.now() + 3 * 60 * 60 * 1000
  );

  /** mocked orcid */
  const orcid = new OrcidService();

  /** mocked twitter */
  const _twitter = new TwitterService(time, userRepo, {
    clientId: process.env.TWITTER_CLIENT_ID as string,
    clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
  });

  const twitter = (() => {
    if (MOCK_TWITTER) {
      return getTwitterMock(_twitter);
    }
    return _twitter;
  })();

  /** nanopub */
  const nanopub = new NanopubService(time);

  /** all identity services */
  identityServices.set(PLATFORM.Orcid, orcid);
  identityServices.set(PLATFORM.Twitter, twitter);
  identityServices.set(PLATFORM.Nanopub, nanopub);

  /** users service */
  const usersService = new UsersService(userRepo, identityServices, {
    tokenSecret: process.env.OUR_TOKEN_SECRET as string,
    expiresIn: '30d',
  });

  /** all platforms */
  platformsMap.set(PLATFORM.Twitter, twitter);
  platformsMap.set(PLATFORM.Nanopub, nanopub);

  /** platforms service */
  const platformsService = new PlatformsService(platformsMap);

  /** parser service */
  const parserService = new ParserService(process.env.PARSER_API_URL as string);

  const MockedParser = spy(parserService);

  const mockedResult: ParsePostResult = MOCKED_PARSER_RESULT;

  when(MockedParser.parsePosts(anything())).thenResolve(mockedResult);
  const mockedParser = instance(MockedParser);

  /** posts service */
  const postsProcessing = new PostsProcessing(
    usersService,
    postsRepo,
    platformPostsRepo,
    platformsService
  );

  const postsManager = new PostsManager(
    db,
    usersService,
    postsProcessing,
    platformsService,
    mockedParser
  );

  const services: Services = {
    users: usersService,
    postsManager: postsManager,
    platforms: platformsService,
    time: time,
    db,
  };

  return services;
};
