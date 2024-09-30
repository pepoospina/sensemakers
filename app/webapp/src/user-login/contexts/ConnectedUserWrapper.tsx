import { Nav } from 'grommet';
import { PropsWithChildren, createContext, useContext } from 'react';

import { UserPostsContext } from '../../user-home/UserPostsContext';
import { AccountContext } from './AccountContext';
import { AutopostInviteContext } from './AutopostInviteContext';
import { DisconnectUserContext } from './DisconnectUserContext';
import { NavHistoryContext } from './NavHistoryContext';
import { MastodonContext } from './platforms/MastodonContext';
import { OrcidContext } from './platforms/OrcidContext';
import { TwitterContext } from './platforms/TwitterContext';
import { NanopubContext } from './platforms/nanopubs/NanopubContext';
import { ConnectedWallet } from './signer/ConnectedWalletContext';
import { SignerContext } from './signer/SignerContext';

const DEBUG = false;

export interface ConnectedUserContextType {}

const ConnectedUserWrapperValue = createContext<
  ConnectedUserContextType | undefined
>(undefined);

/**
 * A wrapper of all context related to the connected user and its connection
 * to multiple platforms.
 *
 * Hooks designed ot be consumed are all implemented in the ConnectedUserContext
 */
export const ConnectedUserWrapper = (props: PropsWithChildren) => {
  return (
    <ConnectedUserWrapperValue.Provider value={{}}>
      <AccountContext>
        <ConnectedWallet>
          <SignerContext>
            <TwitterContext>
              <MastodonContext>
                <NanopubContext>
                  <OrcidContext>
                    <DisconnectUserContext>
                      <UserPostsContext>
                        <AutopostInviteContext>
                          <NavHistoryContext>
                            {props.children}
                          </NavHistoryContext>
                        </AutopostInviteContext>
                      </UserPostsContext>
                    </DisconnectUserContext>
                  </OrcidContext>
                </NanopubContext>
              </MastodonContext>
            </TwitterContext>
          </SignerContext>
        </ConnectedWallet>
      </AccountContext>
    </ConnectedUserWrapperValue.Provider>
  );
};

export const useConnectedUser = (): ConnectedUserContextType => {
  const context = useContext(ConnectedUserWrapperValue);
  if (!context) throw Error('context not found');
  return context;
};
