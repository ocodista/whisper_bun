export const formatElapsedTime = (startTimeMs: number): string => {
  const elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
