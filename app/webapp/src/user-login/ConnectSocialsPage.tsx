import { Box } from 'grommet';
import { useTranslation } from 'react-i18next';

import { AppLogo } from '../app/brand/AppLogo';
import { MastodonIcon, TwitterIcon } from '../app/common/Icons';
import { PlatformAvatar } from '../app/icons/PlatformAvatar';
import { I18Keys } from '../i18n/i18n';
import { AppButton, AppHeading } from '../ui-components';
import { AppParagraph } from '../ui-components/AppParagraph';
import { Loading } from '../ui-components/LoadingDiv';
import { PlatformSection } from '../user-settings/PlatformsSection';
import {
  OverallLoginStatus,
  useAccountContext,
} from './contexts/AccountContext';
import { useMastodonContext } from './contexts/platforms/MastodonContext';
import { useTwitterContext } from './contexts/platforms/TwitterContext';
import { isValidMastodonDomain } from './user.helper';

export const ConnectSocialsPage = () => {
  const { t } = useTranslation();
  const { twitterProfile, mastodonProfile, setOverallLoginStatus } =
    useAccountContext();
  const { connect: connectTwitter } = useTwitterContext();
  const { connect: connectMastodon, error: mastodonError } =
    useMastodonContext();

  const handleContinue = () => {
    if (twitterProfile || mastodonProfile) {
      setOverallLoginStatus(OverallLoginStatus.FullyLoggedIn);
    }
  };

  const content = (() => {
    if (connectTwitter && connectMastodon) {
      return (
        <Box>
          <Box style={{ flexGrow: 1 }}>
            <AppHeading level="1">{t(I18Keys.connectSocialsTitle)}</AppHeading>
            <Box width="100%" height="16px"></Box>
            <AppParagraph margin={{ bottom: 'medium' }}>
              {t(I18Keys.connectSocialsParagraph)}
            </AppParagraph>
            <PlatformSection
              icon={
                twitterProfile ? (
                  <PlatformAvatar
                    profileImageUrl={twitterProfile?.profile_image_url}
                  />
                ) : (
                  <TwitterIcon size={40} color="black"></TwitterIcon>
                )
              }
              platformName={t(I18Keys.XTwitter)}
              onButtonClicked={() => connectTwitter('read')}
              buttonText={twitterProfile ? '' : 'connect'}
              username={twitterProfile ? `@${twitterProfile.username}` : ''}
              connected={!!twitterProfile}
            />
            <PlatformSection
              icon={
                mastodonProfile ? (
                  <PlatformAvatar profileImageUrl={mastodonProfile?.avatar} />
                ) : (
                  <MastodonIcon size={40} color="white"></MastodonIcon>
                )
              }
              platformName={'Mastodon'}
              onButtonClicked={(inputText) =>
                connectMastodon(inputText || '', 'read')
              }
              buttonText={mastodonProfile ? '' : 'connect'}
              username={
                mastodonProfile
                  ? `@${mastodonProfile.username}@${mastodonProfile.mastodonServer}`
                  : ''
              }
              connected={!!mastodonProfile}
              hasInput={true}
              inputPlaceholder={t(I18Keys.mastodonServerPlaceholder)}
              isValidInput={isValidMastodonDomain}
            />
            {mastodonError && (
              <Box margin={{ top: 'small' }}>
                <AppParagraph color="status-error">
                  {mastodonError}
                </AppParagraph>
              </Box>
            )}
          </Box>
          <Box align="center" margin={{ top: 'large' }}>
            <AppButton
              primary
              label={t(I18Keys.continue)}
              onClick={handleContinue}
              disabled={!twitterProfile && !mastodonProfile}
              style={{ width: '100%' }}
            />
          </Box>
        </Box>
      );
    } else {
      return <Loading></Loading>;
    }
  })();

  return (
    <Box
      pad={{ horizontal: 'medium', vertical: 'large' }}
      style={{ flexGrow: 1 }}>
      <AppLogo margin={{ bottom: 'xlarge' }}></AppLogo>
      <Box style={{ flexGrow: 1 }}>{content}</Box>
    </Box>
  );
};
