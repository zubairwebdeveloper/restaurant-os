"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import { registerAppListeners } from "@/store/listenerMiddleware";

export default function ReduxProvider({ children }) {
  // Lazy initial state: one store per provider mount, never shared between requests.
  const [store] = useState(() => makeStore());

  useEffect(() => registerAppListeners(store), [store]);

  return <Provider store={store}>{children}</Provider>;
}
