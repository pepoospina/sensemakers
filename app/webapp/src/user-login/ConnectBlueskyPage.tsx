import { Box } from 'grommet';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { AppLogo } from '../app/brand/AppLogo';
import { I18Keys } from '../i18n/i18n';
import { AbsoluteRoutes } from '../route.names';
import { AppButton, AppHeading, AppInput } from '../ui-components';
import { AppParagraph } from '../ui-components/AppParagraph';
import { useAccountContext } from './contexts/AccountContext';
import { useBlueskyContext } from './contexts/platforms/BlueskyContext';

export const ConnectBlueskyPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { connect, error } = useBlueskyContext();
  const { blueskyProfile } = useAccountContext();
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');

  useEffect(() => {
    if (blueskyProfile) {
      navigate(AbsoluteRoutes.App);
    }
  }, [blueskyProfile, navigate]);

  const handleConnect = () => {
    if (connect) {
      connect(username, appPassword);
    }
  };

  return (
    <Box
      pad={{ horizontal: 'medium', vertical: 'large' }}
      style={{ flexGrow: 1 }}>
      <AppLogo margin={{ bottom: 'xlarge' }} />
      <Box style={{ flexGrow: 1 }}>
        <AppHeading level="1">{t(I18Keys.connectBlueskyTitle)}</AppHeading>
        <Box width="100%" height="16px" />
        <AppParagraph margin={{ bottom: 'medium' }}>
          {t(I18Keys.connectBlueskyParagraph)}
        </AppParagraph>
        <AppParagraph
          margin={{ bottom: 'small' }}
          size="small"
          style={{ fontWeight: 'bold' }}>
          {t(I18Keys.blueskyUsername)}
        </AppParagraph>
        <Box margin={{ bottom: 'medium' }}>
          <AppInput
            placeholder={t(I18Keys.blueskyUsernamePlaceholder)}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={{ width: '100%' }}
          />
        </Box>
        <AppParagraph
          margin={{ bottom: 'small' }}
          size="small"
          style={{ fontWeight: 'bold' }}>
          {t(I18Keys.blueskyAppPassword)}
        </AppParagraph>
        <Box margin={{ bottom: 'medium' }}>
          <AppInput
            type="password"
            placeholder={t(I18Keys.blueskyAppPasswordPlaceholder)}
            value={appPassword}
            onChange={(event) => setAppPassword(event.target.value)}
            style={{ width: '100%' }}
          />
        </Box>
        <Box align="center" margin={{ top: 'medium' }}>
          <AppButton
            primary
            label={t(I18Keys.continue)}
            onClick={handleConnect}
            disabled={!username || !appPassword}
            style={{ width: '100%' }}
          />
        </Box>
        {error && (
          <Box margin={{ top: 'small' }}>
            <AppParagraph color="status-error">{error}</AppParagraph>
          </Box>
        )}
      </Box>
    </Box>
  );
};
