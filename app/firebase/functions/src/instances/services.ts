import { PLATFORM } from '../@shared/types';
import {
  OUR_EXPIRES_IN,
  OUR_TOKEN_SECRET,
  TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET,
} from '../config/config.runtime';
import { DBInstance } from '../db/instance';
import { OrcidService } from '../platforms/orcid/orcid.service';
import { IdentityPlatforms } from '../platforms/platforms.interface';
import { TwitterService } from '../platforms/twitter/twitter.service';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';

export interface Services {
  users: UsersService;
}

export const createServices = () => {
  const db = new DBInstance();
  const userRepo = new UsersRepository(db);
  const identityServices: IdentityPlatforms = new Map();

  const orcid = new OrcidService();
  const twitter = new TwitterService({
    clientId: TWITTER_CLIENT_ID.value(),
    clientSecret: TWITTER_CLIENT_SECRET.value(),
  });

  /** all identity services */
  identityServices.set(PLATFORM.Orcid, orcid);
  identityServices.set(PLATFORM.Twitter, twitter);

  /** users service */
  const usersService = new UsersService(userRepo, identityServices, {
    tokenSecret: OUR_TOKEN_SECRET.value(),
    expiresIn: OUR_EXPIRES_IN,
  });

  const services: Services = {
    users: usersService,
  };

  return services;
};