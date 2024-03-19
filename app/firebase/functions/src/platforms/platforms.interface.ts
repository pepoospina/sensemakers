import { PLATFORM } from '../@shared/types';

export interface IdentityService<SignupContext, SignupData, UserDetails> {
  /** provides info needed by the frontend to start the signup flow */
  getSignupContext: (userId?: string) => Promise<SignupContext>;
  /** handles the data obtained by the frontend after the signup flow */
  handleSignupData: (signupData: SignupData) => Promise<UserDetails>;
}

export interface PlatformService<SignupContext, SignupData, UserDetails>
  extends IdentityService<SignupContext, SignupData, UserDetails> {}

export type IdentityPlatforms = Map<PLATFORM, IdentityService<any, any, any>>;