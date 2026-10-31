/**
 * Middleware pipeline. Redux Toolkit's defaults stay enabled, including the
 * serializability and immutability checks (development only).
 * Keep Firebase SDK objects and Timestamps OUT of actions - convert to plain values first.
 */
export function buildMiddleware(listener) {
  return (getDefaultMiddleware) => getDefaultMiddleware().prepend(listener.middleware);
}
