import { Box } from 'grommet';

import { OntologyItem } from '../../../shared/types/types.parser';

/** UI-only label render  */
export const LabelsSelector = (props: {
  options: OntologyItem[];
  selected: string[];
  onSelected: (uri: string) => void;
}) => {
  return <Box></Box>;
};
