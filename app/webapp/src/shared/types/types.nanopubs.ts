/** NANOPUB */
import { HexStr, UserDetailsBase } from './types';

/**
 * Nanopubs use private keys for authentication, no need to store credentials for each
 * user
 */

export interface NanopubUserProfile {
  rsaPublickey: string;
  ethAddress: HexStr;
  introNanopub?: string;
}

export interface NanopubUserDetails
  extends UserDetailsBase<NanopubUserProfile, undefined, undefined> {}

export interface RSAKeys {
  privateKey: string;
  publicKey: string;
  address?: HexStr;
}