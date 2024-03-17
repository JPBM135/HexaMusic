export function formatDuration(durationMs: number) {
  const seconds = Math.floor(durationMs / 1_000) % 60;
  const minutes = Math.floor(durationMs / 1_000 / 60) % 60;
  const hours = Math.floor(durationMs / 1_000 / 60 / 60) % 24;

  const secondsStr = seconds.toString().padStart(2, '0');
  const minutesStr = minutes.toString().padStart(2, '0');
  const hoursStr = hours.toString().padStart(2, '0');

  if (hours === 0) return `${minutesStr}:${secondsStr}`;

  return `${hoursStr}:${minutesStr}:${secondsStr}`;
}
