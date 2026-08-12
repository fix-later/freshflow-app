import type { HubConnection } from '@microsoft/signalr';

// Upper bound on how long we'll wait for an in-flight start() before stopping
// anyway. The HubConnectionBuilder here has no configured negotiate timeout,
// so a true network black hole could otherwise leave start() pending forever
// and the connection (with its event handlers closing over an unmounted
// screen's state) never gets torn down.
const MAX_WAIT_MS = 15_000;

/**
 * Stops a HubConnection only after its in-flight start() attempt has settled
 * (or MAX_WAIT_MS elapses, whichever comes first). Calling stop() while
 * start() is still negotiating throws "Failed to start the HttpConnection
 * before stop() was called" (SignalR logs it at Error level even though it's
 * an expected, harmless race) — every caller that tears down a connection on
 * unmount/blur must route through here instead of calling connection.stop()
 * directly.
 */
export function stopAfterStart(connection: HubConnection, startAttempt: Promise<unknown>): void {
  const settled = startAttempt.catch(() => undefined);
  const timedOut = new Promise<void>((resolve) => setTimeout(resolve, MAX_WAIT_MS));
  void Promise.race([settled, timedOut]).then(() => connection.stop().catch(() => undefined));
}
