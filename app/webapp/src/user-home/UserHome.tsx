import { Box, BoxExtendedProps, DropButton, Menu, Text } from 'grommet';
import { Refresh } from 'grommet-icons';
import { CSSProperties, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useToastContext } from '../app/ToastsContext';
import { I18Keys } from '../i18n/i18n';
import { PostCard } from '../post/PostCard';
import { PostsQueryStatus, UserPostsQuery } from '../shared/types/types.posts';
import { AppButton, AppHeading, AppSelect } from '../ui-components';
import { BoxCentered } from '../ui-components/BoxCentered';
import { Loading, LoadingDiv } from '../ui-components/LoadingDiv';
import { useThemeContext } from '../ui-components/ThemedApp';
import { useUserPosts } from './UserPostsContext';

const statusPretty: Record<PostsQueryStatus, string> = {
  all: 'All',
  ignored: 'Ignored',
  pending: 'Pending',
  published: 'Published',
};

export const UserHome = () => {
  const { constants } = useThemeContext();
  const { t } = useTranslation();
  const { show } = useToastContext();

  const {
    filterStatus,
    posts,
    errorFetchingOlder,
    fetchOlder,
    fetchNewer,
    isFetchingNewer,
    errorFetchingNewer,
  } = useUserPosts();

  useEffect(() => {
    const error = errorFetchingOlder || errorFetchingNewer;
    if (error) {
      show({
        title: 'Error getting users posts',
        message: error.message.includes('429')
          ? "Too many requests to Twitter's API. Please retry in 10-15 minutes"
          : error.message,
      });
    }
  }, [errorFetchingOlder, errorFetchingNewer]);

  const navigate = useNavigate();

  const setFilter = (filter: UserPostsQuery) => {
    navigate(`/${filter.status}`);
  };

  const content = posts && (
    <>
      {posts.length === 0 && (
        <BoxCentered>
          <Text>No posts found</Text>
        </BoxCentered>
      )}

      {posts.map((post, ix) => (
        <Box key={ix}>
          <PostCard post={post}></PostCard>
        </Box>
      ))}

      {posts.length > 0 && !errorFetchingOlder ? (
        <AppButton label="fetch older" onClick={() => fetchOlder()}></AppButton>
      ) : posts.length > 0 ? (
        <LoadingDiv></LoadingDiv>
      ) : (
        <> </>
      )}
    </>
  );

  const FilterValue = (
    props: {
      status: PostsQueryStatus;
      border?: boolean;
    } & BoxExtendedProps
  ) => {
    const borderStyle: CSSProperties = props.border
      ? {
          border: '1px solid',
          borderRadius: '8px',
          borderColor: constants.colors.border,
        }
      : {};
    return (
      <Box
        pad={{ horizontal: 'medium', vertical: 'small' }}
        width="100%"
        style={{
          ...borderStyle,
        }}>
        <Text size="14px">{statusPretty[props.status]}</Text>
      </Box>
    );
  };

  const options: PostsQueryStatus[] = [
    PostsQueryStatus.ALL,
    PostsQueryStatus.PENDING,
    PostsQueryStatus.PUBLISHED,
    PostsQueryStatus.IGNORED,
  ];

  const menu = (
    <AppSelect
      value={
        filterStatus ? (
          <FilterValue border status={filterStatus}></FilterValue>
        ) : (
          <FilterValue border status={PostsQueryStatus.ALL}></FilterValue>
        )
      }
      options={options}
      onChange={(e) =>
        setFilter({
          status: e.target.value,
          fetchParams: { expectedAmount: 10 },
        })
      }>
      {(status) => {
        return <FilterValue status={status}></FilterValue>;
      }}
    </AppSelect>
  );

  const reload = isFetchingNewer ? (
    <Box>
      <Loading color={constants.colors.primary} size="20px"></Loading>
    </Box>
  ) : (
    <AppButton
      plain
      icon={<Refresh color={constants.colors.primary} size="20px"></Refresh>}
      onClick={() => fetchNewer()}></AppButton>
  );

  const header = (
    <Box pad={{ top: '24px', horizontal: '12px' }} style={{ flexShrink: 0 }}>
      <Box direction="row" margin={{ bottom: '12px' }}>
        <AppHeading level="3">{t(I18Keys.yourPublications)}</AppHeading>
      </Box>

      <Box direction="row" align="center">
        <Box style={{ flexGrow: 1 }}>{menu}</Box>
        <Box pad={{ horizontal: '10px' }}>{reload}</Box>
      </Box>
    </Box>
  );

  return (
    <>
      {header}

      <Box
        fill
        gap="large"
        pad={{ vertical: 'large', horizontal: 'medium' }}
        justify="start">
        {content}
      </Box>
    </>
  );
};
