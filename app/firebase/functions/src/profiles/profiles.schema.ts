import { array, object, string } from 'yup';

export const profilesFetchSchema = object({
  profileUrls: array().of(string()).required(),
}).noUnknown(true);
