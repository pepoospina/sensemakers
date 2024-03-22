import * as jwt from 'jsonwebtoken';

import { OurTokenConfig, PLATFORM, UserWithId } from '../@shared/types';
import { IdentityPlatforms } from '../platforms/platforms.interface';
import { UsersRepository } from './users.repository';
import { getPrefixedUserId } from './users.utils';

interface TokenData {
  userId: string;
}

/**
 * A user profile is made up of a dictionary of PLATFORM => Arrray<AuthenticationDetails>
 * One user can have multiple profiles on each platform.
 *
 * Authentication details may be OAuth access tokens, or validated details about the user
 * identity like its public key/address.
 */
export class UsersService {
  constructor(
    public repo: UsersRepository,
    public platforms: IdentityPlatforms,
    protected ourToken: OurTokenConfig
  ) {}

  private getIdentityService(platform: PLATFORM) {
    const service = this.platforms.get(platform);
    if (!service) {
      throw new Error(`Identity service ${platform} not found`);
    }
    return service;
  }

  /**
   * This method request the user signup context and stores it in the user profile.
   * If the user is not defined (first time), the details are stored on a temporary
   * collection and associated to a random signup_token
   */
  public async getSignupContext(
    platform: PLATFORM,
    userId?: string,
    params?: any
  ) {
    const context = await this.getIdentityService(platform).getSignupContext(
      userId,
      params
    );

    return context;
  }

  /**
   * This method validates the signup data and stores it in the user profile. If
   * a userId is provided the user must exist and a new platform is added to it,
   * otherewise a new user is created.
   */
  public async handleSignup(
    platform: PLATFORM,
    signupData: any,
    _userId?: string // MUST be the authenticated userId
  ): Promise<
    | {
        userId: string;
        ourAccessToken?: string;
      }
    | undefined
  > {
    /**
     * validate the signup data for this platform and convert it into
     * user details
     */
    const authenticatedDetails =
      await this.getIdentityService(platform).handleSignupData(signupData);

    const prefixed_user_id = getPrefixedUserId(
      platform,
      authenticatedDetails.user_id
    );

    const existingUserWithPlatformAccount =
      await this.repo.getUserWithPlatformAccount(
        platform,
        authenticatedDetails.user_id
      );

    if (_userId) {
      /**
       * authenticated userId is provided: then the users exists and may or may not have
       * already registered this platform user_id
       * */

      if (existingUserWithPlatformAccount) {
        /**
         * a user has already registered this platform user_id, then check which user registered it.
         * */

        if (existingUserWithPlatformAccount.userId !== _userId) {
          /**
           * the user with this platform user_id is another userId then we have a problem. This person has two
           *  user profiles on our app and the should be merged.
           * */

          throw new Error(
            `Unexpected, existing user ${existingUserWithPlatformAccount.userId} with this platform user_id ${prefixed_user_id} does not match the userId provided ${_userId}`
          );
        }

        /**
         * the user with this platform user_id is the same authenticated userId, then simply return. The current
         * ourAccessToken is valid and this is an unexpected call since there was no need to signup with this platform
         * and user_id
         * */
        return {
          userId: _userId,
        };
      } else {
        /**
         * the user has not registered this platform user_id, then store it as a new entry on the [platform] array
         * of the AppUser object
         * */

        await this.repo.setPlatformDetails(
          _userId,
          platform,
          authenticatedDetails
        );
      }
    } else {
      /**
       * authenticated userId not provided: the user may or may not exist
       * */

      if (existingUserWithPlatformAccount) {
        /**
         * a user exist with this platform user_id, then return an accessToken and consider this a login for that userId
         * */

        const userId = existingUserWithPlatformAccount.userId;

        await this.repo.setPlatformDetails(
          userId,
          platform,
          authenticatedDetails
        );

        return {
          ourAccessToken: this.generateOurAccessToken({
            userId,
          }),
          userId,
        };
      } else {
        /**
         * a user does not exist with this platform user_id then this is the first time that platform is used to signin
         * and we need to create a new user.
         * */

        const platformIds_property: keyof UserWithId = 'platformIds';

        await this.repo.createUser(prefixed_user_id, {
          [platformIds_property]: [prefixed_user_id],
          [platform]: [authenticatedDetails],
        });

        return {
          ourAccessToken: this.generateOurAccessToken({
            userId: prefixed_user_id,
          }),
          userId: prefixed_user_id,
        };
      }
    }

    return;
  }

  protected generateOurAccessToken(data: TokenData) {
    return jwt.sign(data, this.ourToken.tokenSecret, {
      expiresIn: this.ourToken.expiresIn,
    });
  }

  public verifyAccessToken(token: string) {
    const verified = jwt.verify(token, this.ourToken.tokenSecret, {
      complete: true,
    }) as unknown as jwt.JwtPayload & TokenData;
    return verified.payload.userId;
  }
}
