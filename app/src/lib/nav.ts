import { router, type Href } from 'expo-router';

/** Navigate to a path built at runtime (e.g. `/profile/${id}`). */
export const go = (path: string) => router.push(path as Href);
export const goReplace = (path: string) => router.replace(path as Href);
