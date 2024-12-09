import { Box, BoxExtendedProps, Text } from 'grommet';
import { useState } from 'react';
import { Popover } from 'react-tiny-popover';

import { LabelsSelector } from '../semantics/patterns/refs-labels/LabelsSelector';
import { AppButton } from '../ui-components';
import { useThemeContext } from '../ui-components/ThemedApp';
import { FeedTabConfig } from './feed.config';

const ChevronDown = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none">
      <path
        d="M12 6.40002L8 10.4L4 6.40002"
        stroke="#4B5563"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export const TabElement = (props: {
  tab: FeedTabConfig;
  isSelected: boolean;
  onTabClicked: (tabId: string) => void;
}) => {
  const { constants } = useThemeContext();
  const { tab, isSelected, onTabClicked } = props;

  const [isOpen, setIsOpen] = useState(false);

  const borderStyle = `1px solid ${constants.colors.border}`;

  const internalBoxProps: BoxExtendedProps = {
    direction: 'row',
    gap: '6px',
    align: 'center',
    justify: 'center',
    style: { minWidth: '88px', height: '100%' },
  };

  const externalBoxProps: BoxExtendedProps = {
    style: {
      flex: '0 0 auto',
      height: '100%',
      justifyContent: 'center',
      backgroundColor: isSelected ? '#FFFFFF' : 'transparent',
      borderTop: isSelected ? borderStyle : 'none',
      borderLeft: isSelected ? borderStyle : 'none',
      borderRight: isSelected ? borderStyle : 'none',
      borderBottom: isSelected ? 'none' : borderStyle,
      borderRadius: '8px 8px 0 0',
    },
  };

  const showChevron = tab.labels.length > 0;

  return (
    <Box {...externalBoxProps} key={tab.id}>
      <AppButton plain style={{ height: '100%' }}>
        <Box {...internalBoxProps}>
          <Box
            pad={{ left: '12px' }}
            style={{ height: '100%' }}
            justify="center"
            onClick={() => {
              onTabClicked(tab.id);
            }}>
            <Text size="small">{tab.title}</Text>
          </Box>
          {showChevron && (
            <Popover
              isOpen={isOpen}
              positions={['bottom']}
              content={<LabelsSelector options={}></LabelsSelector>}>
              <Box onClick={() => setIsOpen(!isOpen)} pad={{ right: '12px' }}>
                <ChevronDown></ChevronDown>
              </Box>
            </Popover>
          )}
        </Box>
      </AppButton>
    </Box>
  );
};
