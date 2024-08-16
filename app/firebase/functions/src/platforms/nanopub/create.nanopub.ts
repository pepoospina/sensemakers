import { Store } from 'n3';

import { AppPostFull } from '../../@shared/types/types.posts';
import { AppUser } from '../../@shared/types/types.user';
import { parseRDF, replaceNodes } from '../../@shared/utils/n3.utils';
import { PostsHelper } from '../../posts/posts.helper';
import { buildSpostNp } from './nanopub.utils';
import { prepareNanopubDetails } from './prepare.nanopub.details';

export const createNanopublication = async (
  post: AppPostFull,
  user: AppUser
) => {
  const {
    introUri,
    twitterUsername,
    twitterName,
    autopostOption,
    ethAddress,
    orcidId,
    tweetUrl,
    latestNanopubUri,
    rootNanopubUri,
  } = prepareNanopubDetails(user, post);

  const semantics = post.semantics;
  const content = PostsHelper.concatenateThread(post.generic);

  const semanticsParserStore = await (async () => {
    if (!semantics) return new Store();

    return await parseRDF(semantics);
  })();
  // Define the replacement map that swaps our placeholder with np placeholder
  const replaceMap: Record<string, string> = {
    'https://sense-nets.xyz/mySemanticPost':
      'http://purl.org/nanopub/temp/mynanopub#',
  };

  const semanticsStore = replaceNodes(semanticsParserStore, replaceMap);

  const supersedesOptions = (() => {
    if (rootNanopubUri && latestNanopubUri) {
      return {
        root: rootNanopubUri,
        latest: latestNanopubUri,
      };
    } else {
      return undefined;
    }
  })();

  const options = {
    orcidId: orcidId,
    supersedesOptions,
  };

  return buildSpostNp(
    ethAddress,
    introUri,
    twitterUsername,
    autopostOption,
    twitterName,
    semanticsStore,
    content,
    tweetUrl,
    options
  );
};
