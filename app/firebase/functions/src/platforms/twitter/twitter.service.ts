import {
  TwitterSignupContext,
  TwitterSignupData,
  TwitterUserDetails,
} from 'src/@shared/types.twitter';
import { TweetV2PostTweetResult, TwitterApi } from 'twitter-api-v2';

import { TWITTER_CALLBACK_URL } from '../../config/config.runtime';
import { PlatformService } from '../platforms.interface';

export interface TwitterApiCredentials {
  key: string;
  secret: string;
}

export interface UserClientParameters {
  oauth_token: string;
  oauth_token_secret: string;
}

export class TwitterService
  implements
    PlatformService<
      TwitterSignupContext,
      TwitterSignupData,
      TwitterUserDetails
    >
{
  constructor(protected credentials: TwitterApiCredentials) {}

  private getGenericClient() {
    return new TwitterApi({
      appKey: this.credentials.key,
      appSecret: this.credentials.secret,
    });
  }

  private async getUserClient(params: UserClientParameters) {
    return new TwitterApi({
      appKey: this.credentials.key,
      appSecret: this.credentials.secret,
      accessToken: params.oauth_token,
      accessSecret: params.oauth_token_secret,
    });
  }

  public async getSignupContext() {
    const client = this.getGenericClient();

    const authLink = await client.generateAuthLink(TWITTER_CALLBACK_URL, {
      linkMode: 'authorize',
    });

    return authLink;
  }

  async handleSignupData(data: TwitterSignupData): Promise<TwitterUserDetails> {
    const client = await this.getUserClient(data);
    const result = await client.login(data.oauth_verifier);

    const twitter: TwitterUserDetails = {
      user_id: result.userId,
      write: {
        accessToken: result.accessToken,
        accessSecret: result.accessSecret,
      },
      profile: {
        screen_name: result.screenName,
      },
    };

    return twitter;
  }

  async postMessageTwitter(
    params: UserClientParameters,
    text: string
  ): Promise<TweetV2PostTweetResult['data']> {
    const client = await this.getUserClient(params);
    const result = await client.v2.tweet(text);

    return result.data;
  }

  async fetch() {
    return [];
  }
}