import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { _appFetch } from '../../api/app.fetch';
import { TwitterUserProfile } from '../../shared/types/types.twitter';
import {
  AppUserRead,
  EmailDetails,
  PLATFORM,
} from '../../shared/types/types.user';
import { getAccount } from '../user.helper';

const DEBUG = true;

export const OUR_TOKEN_NAME = 'ourToken';

export type AccountContextType = {
  connectedUser?: AppUserRead;
  hasTriedFetchingUser: boolean;
  isConnected: boolean;
  twitterProfile?: TwitterUserProfile;
  email?: EmailDetails;
  disconnect: () => void;
  refresh: () => void;
  token?: string;
  setToken: (token: string) => void;
  setLoginStatus: (status: LoginStatus) => void;
  loginStatus: LoginStatus;
};

const AccountContextValue = createContext<AccountContextType | undefined>(
  undefined
);

export enum LoginStatus {
  LoggedOut = 'LoggedOut',
  LoggingIn = 'LoggingIn',
  LoggedIn = 'LoggedIn',
}

/**
 * Manages the logged-in user. We use JWT tokens to authenticate
 * a logged in user to our backend. The JWT is set when the user
 * logsin or sign up with any supported platform, and is stored
 * in the localStorage
 */
export const AccountContext = (props: PropsWithChildren) => {
  const [connectedUser, setConnectedUser] = useState<AppUserRead | null>();
  const [hasTriedFetchingUser, setHasTriedFetchingUser] =
    useState<boolean>(false);

  const [token, setToken] = useState<string | undefined>(undefined);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>(
    LoginStatus.LoggedOut
  );

  useEffect(() => {
    if (DEBUG) console.log('reading token from localstorage');
    const _token = localStorage.getItem(OUR_TOKEN_NAME);

    if (_token) {
      if (DEBUG) console.log('tokend found in localstorage');
      setToken(_token);
    }
  }, []);

  const checkToken = () => {
    const _token = localStorage.getItem(OUR_TOKEN_NAME);

    if (_token !== null) {
      if (DEBUG) console.log('tokend found in localstorage');
      setToken(_token);
    } else {
      setToken(undefined);
      setConnectedUser(null);
    }
  };

  const refresh = async () => {
    try {
      if (token) {
        const user = await _appFetch<AppUserRead>('/api/auth/me', {}, token);
        if (DEBUG) console.log('got connected user', { user });
        setConnectedUser(user);
        setHasTriedFetchingUser(true);
      } else {
        setConnectedUser(null);
      }
    } catch (e) {
      disconnect();
      setLoginStatus(LoginStatus.LoggedOut);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem(OUR_TOKEN_NAME, token);
    }
    refresh();
  }, [token]);

  /** logged in status is strictly linked to the connected user,
   * this should be the only place on the app where the status is set to loggedIn
   */
  useEffect(() => {
    if (connectedUser && connectedUser.email) {
      setLoginStatus(LoginStatus.LoggedIn);
    } else if (connectedUser) {
      // setLoginStatus(LoginStatus.LoggingIn);  not needed, logging in should be the status already
    } else {
      setLoginStatus(LoginStatus.LoggedOut);
    }
  }, [connectedUser]);

  const disconnect = () => {
    if (DEBUG) console.log('disconnecting');
    localStorage.removeItem(OUR_TOKEN_NAME);
    checkToken();
  };

  const twitterProfile = connectedUser
    ? getAccount(connectedUser, PLATFORM.Twitter)?.profile
    : undefined;

  const email = connectedUser ? connectedUser.email : undefined;

  return (
    <AccountContextValue.Provider
      value={{
        connectedUser: connectedUser === null ? undefined : connectedUser,
        hasTriedFetchingUser,
        twitterProfile,
        email,
        isConnected: connectedUser !== undefined && connectedUser !== null,
        disconnect,
        refresh,
        token,
        setToken,
        setLoginStatus,
        loginStatus,
      }}>
      {props.children}
    </AccountContextValue.Provider>
  );
};

export const useAccountContext = (): AccountContextType => {
  const context = useContext(AccountContextValue);
  if (!context) throw Error('context not found');
  return context;
};
