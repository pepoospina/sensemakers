import { useQuery } from '@tanstack/react-query';
import { Anchor, Box, Text } from 'grommet';
import { useMemo } from 'react';

import { NanopubIcon } from '../app/icons/NanopubIcon';
import { PLATFORM } from '../shared/types/types';
import {
  AppPostFull,
  AppPostParsedStatus,
  AppPostParsingStatus,
  AppPostReviewStatus,
} from '../shared/types/types.posts';
import { useStatus } from './useStatus';

export const NanopubStatus = (props: { post?: AppPostFull }) => {
  const { post } = props;

  const { nanopubPublished, processed, isParsing, errored, pending, ignored } =
    useStatus(post);

  if (nanopubPublished) {
    return (
      <Anchor href={nanopubPublished.uri} target="_blank">
        <StatusTag label="Published" color="#337FBD"></StatusTag>
      </Anchor>
    );
  }

  if (!processed) {
    if (isParsing)
      return <StatusTag label="Processing" color="#6B7280"></StatusTag>;

    if (errored) return <StatusTag label="Error" color="#6B7280"></StatusTag>;

    return <StatusTag label="Not processed" color="#6B7280"></StatusTag>;
  }

  if (pending) {
    return <StatusTag label="For Review" color="#F79A3E"></StatusTag>;
  }

  if (ignored) {
    return <StatusTag label="Ignored" color="#D1D5DB"></StatusTag>;
  }

  return <></>;
};

export const StatusTag = (props: { label: string; color: string }) => {
  const { label, color } = props;
  return (
    <Box
      direction="row"
      gap="small"
      align="center"
      style={{
        borderRadius: '4px',
        border: '1px solid #D1D5DB',
        height: '20px',
        padding: '2px 4px',
      }}>
      <NanopubIcon size={14} color={color}></NanopubIcon>
      <Text
        style={{
          color: '#6B7280',
          fontSize: '14px',
          fontStyle: 'normal',
          fontWeight: '500',
          lineHeight: '16px',
        }}>
        {label}
      </Text>
    </Box>
  );
};