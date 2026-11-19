// Web: the browser's localStorage (undefined during static rendering).
export const sessionStorage = typeof window !== 'undefined' ? window.localStorage : undefined;
