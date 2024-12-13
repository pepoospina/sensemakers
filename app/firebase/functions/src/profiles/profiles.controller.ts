import { RequestHandler } from 'express';
import { object, string } from 'yup';

import { PUBLISHABLE_PLATFORM } from '../@shared/types/types.platforms';
import {
  AccountProfileBase,
  AccountProfileRead,
  LaunchProfilesFetchPayload,
} from '../@shared/types/types.profiles';
import { GetProfilePayload } from '../@shared/types/types.user';
import {
  getProfileId,
  parseProfileUrl,
  splitProfileId,
} from '../@shared/utils/profiles.utils';
import { getServices } from '../controllers.utils';
import { logger } from '../instances/logger';
import { FETCH_ACCOUNT_TASKS } from '../platforms/platforms.tasks';
import { chunkNumber, enqueueTask } from '../tasksUtils/tasks.support';
import { profilesFetchSchema } from './profiles.schema';

const DEBUG = false;

export const getProfileSchema = object({
  platformId: string().required(),
  user_id: string().optional(),
  username: string().optional(),
});

/**
 * get user posts from the DB (does not fetch for more)
 * */
export const getProfileController: RequestHandler = async (
  request,
  response
) => {
  try {
    const payload = (await getProfileSchema.validate(
      request.body
    )) as GetProfilePayload;

    logger.debug(`${request.path} - payload`, { payload });
    const { users, db } = getServices(request);

    /** The chunk below would be a nice getPublicProfile method under userService */
    /** HERE */
    const profile = await db.run(async (manager) => {
      if (payload.user_id) {
        return users.profiles.getByProfileId(
          getProfileId(payload.platformId, payload.user_id),
          manager,
          false
        );
      }

      const profileId = await users.profiles.getByPlatformUsername(
        payload.platformId,
        payload.username!,
        manager,
        true /** most get methods have a should throw parameter, no need to check for undefined below */
      );

      return users.profiles.getByProfileId(profileId, manager, false);
    });

    const publicProfile: AccountProfileRead | undefined = profile && {
      platformId: profile.platformId,
      user_id: profile.user_id,
      profile: profile.profile,
      userId: profile.userId,
    };
    /** TO HERE */

    if (DEBUG)
      logger.debug(`${request.path}: profile`, { profile: publicProfile });
    response.status(200).send({ success: true, data: profile });
  } catch (error: any) {
    logger.error('error', error);
    response.status(500).send({ success: false, error: error.message });
  }
};

/** Maybe this should be renamed to launchProfilesFetch and it should do only that.  */
export const addNonUserProfilesController: RequestHandler = async (
  request,
  response
) => {
  try {
    if (DEBUG)
      logger.debug(`${request.path}: Starting addAccountsDataController`, {
        payloads: request.body,
      });

    const services = getServices(request);
    /** we should always use yup validation */
    const profileUrls = request.body as string[];

    /** you can parse inside the for, no need to prepare the parsedProfiles array */
    const parsedProfiles = profileUrls
      .map((profileUrl) => {
        const parsed = parseProfileUrl(profileUrl);
        return parsed;
      })
      .filter((profile) => profile); // this filter is not doing anything.

    for (const parsedProfile of parsedProfiles) {
      if (!parsedProfile) {
        continue;
      }
      if (DEBUG)
        logger.debug('Preparing to launch fetch task for profile', {
          platformId: parsedProfile.platformId,
          username: parsedProfile.username,
        });

      let profile: AccountProfileBase | undefined;
      try {
        /** we should never split transactions unless they are stricty strictly necessary */
        /** this call is exactly what getOrCreateProfileByUsername does before creating the profile, probably not needed */
        const hasProfile = await services.db.run(async (manager) => {
          return services.users.profiles.getByPlatformUsername(
            parsedProfile.platformId,
            parsedProfile.username,
            manager
          );
        });

        /** skip fetching this profile if it already exists, as it will be fetched regularly */
        /** this is counter-intuitive, the "user" of this endpoint wants the profile to be fetched now, it can be their
         * responsibility to decide if they want to skip it
         */
        if (hasProfile) {
          if (DEBUG)
            logger.debug('Profile has already been fetched, skipping', {
              profileId: hasProfile,
            });
          continue;
        }

        profile = await services.db.run(async (manager) => {
          return services.users.getOrCreateProfileByUsername(
            parsedProfile.platformId,
            parsedProfile.username,
            manager
          );
        });
      } catch (error) {
        logger.error(
          `error adding profile ${JSON.stringify(parsedProfile)}:`,
          error
        );
        continue;
      }

      if (!profile) {
        const error = `unable to find profile for ${parsedProfile.username} on ${parsedProfile.platformId}`;
        logger.error(error);
        continue;
      }

      if (DEBUG) logger.debug('Profile found', { profile });

      const profileId = getProfileId(
        parsedProfile.platformId,
        profile?.user_id
      );

      const chunkSize = 50;
      const amount = 10;
      const fetchAmountChunks = chunkNumber(amount, chunkSize);

      for (const fetchAmountChunk of fetchAmountChunks) {
        const taskName =
          FETCH_ACCOUNT_TASKS[parsedProfile.platformId as PUBLISHABLE_PLATFORM];

        const taskData = {
          profileId,
          platformId: parsedProfile.platformId,
          latest: false,
          amount: fetchAmountChunk,
        };

        if (DEBUG) logger.debug('Enqueueing task', { taskName, taskData });
        await enqueueTask(taskName, taskData);
      }
    }

    if (DEBUG)
      logger.debug(`${request.path}: Successfully completed addAccountsData`, {
        totalPayloads: parsedProfiles.length,
      });

    response.status(200).send({ success: true });
  } catch (error) {
    logger.error('error', error);
    response.status(500).send({ success: false, error });
  }
};

export const deleteProfilesController: RequestHandler = async (
  request,
  response
) => {
  try {
    if (DEBUG)
      logger.debug(`${request.path}: Starting addAccountsDataController`, {
        payloads: request.body,
      });

    const services = getServices(request);
    /** same comments as above */
    const profileUrls = request.body as string[];
    const parsedProfiles = profileUrls
      .map((profileUrl) => {
        const parsed = parseProfileUrl(profileUrl);
        return parsed;
      })
      .filter((profile) => profile);

    /** You are running these deletes sequentially one by one, this might be slow, We should use processInBatches to
     * to do this type of batch operations on the DB so that we dont overload it but run things in parallel. It can be made 10x faster easily
     */
    for (const parsedProfile of parsedProfiles) {
      if (!parsedProfile) {
        continue;
      }
      if (DEBUG)
        logger.debug('Fetching profile', {
          platformId: parsedProfile.platformId,
          username: parsedProfile.username,
        });

      let profileId: string | undefined;
      try {
        profileId = await services.db.run(async (manager) => {
          return services.users.profiles.getByPlatformUsername(
            parsedProfile.platformId,
            parsedProfile.username,
            manager
          );
        });
      } catch (error) {
        logger.error('error', error);
        continue;
      }

      /** you can use the shouldThrow = true in getByPlatformUsername.
       * Also this existence logic seens unnecessary as deleteAccountFull should account for that already */
      if (!profileId) {
        const error = `unable to find profile for ${parsedProfile.username} on ${parsedProfile.platformId}`;
        logger.error(error);
        continue;
      }

      if (DEBUG) logger.debug('Profile found', { profileId });

      const { platform, user_id } = splitProfileId(profileId);
      await services.postsManager.deleteAccountFull(platform, user_id);
    }

    if (DEBUG)
      logger.debug(`${request.path}: Successfully completed addAccountsData`, {
        totalPayloads: parsedProfiles.length,
      });

    response.status(200).send({ success: true });
  } catch (error) {
    logger.error('error', error);
    response.status(500).send({ success: false, error });
  }
};
