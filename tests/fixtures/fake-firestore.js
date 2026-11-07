/**
 * Small in-memory stand-in for the Admin Firestore API, enough to unit-test server logic:
 * doc/collection refs, where("==")/orderBy/limit queries, count(), and transactions whose
 * writes are buffered and applied atomically at commit (transactions run one at a time).
 * It is NOT a substitute for the emulator; it only exercises our own logic.
 */
// Deep copy of plain data; functions (e.g. Timestamp-like toDate) are kept by reference.
function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
  return value;
}

export function createFakeFirestore(initial = {}) {
  const store = new Map(Object.entries(initial).map(([path, data]) => [path, clone(data)]));
  const stats = { commits: 0, lastWrites: [] };
  let idCounter = 0;
  let lock = Promise.resolve();

  const newId = () => `AUTOID${String(++idCounter).padStart(14, "0")}`;
  const segments = (path) => path.split("/");

  function snapshotOf(path) {
    const data = store.get(path);
    const ref = docRef(path);
    return { id: ref.id, ref, exists: data !== undefined, data: () => (data === undefined ? undefined : clone(data)) };
  }

  function docRef(path) {
    return {
      path,
      id: segments(path).at(-1),
      get parent() {
        return collectionRef(segments(path).slice(0, -1).join("/"));
      },
      get: async () => snapshotOf(path),
      set: async (data) => void store.set(path, clone(data)),
      delete: async () => void store.delete(path),
      update: async (data) => {
        if (!store.has(path)) throw new Error(`No document to update: ${path}`);
        store.set(path, { ...store.get(path), ...clone(data) });
      },
    };
  }

  function runQuery(colPath, filters, order, max) {
    const depth = segments(colPath).length + 1;
    let docs = [...store.keys()]
      .filter((p) => p.startsWith(`${colPath}/`) && segments(p).length === depth)
      .map(snapshotOf)
      .filter((s) => filters.every(([field, , value]) => s.data()[field] === value));
    if (order) {
      const factor = order.dir === "desc" ? -1 : 1;
      docs = docs.sort((a, b) => factor * String(a.data()[order.field] ?? "").localeCompare(String(b.data()[order.field] ?? "")));
    }
    if (max !== undefined) docs = docs.slice(0, max);
    return { docs, empty: docs.length === 0, size: docs.length };
  }

  function queryRef(colPath, filters = [], order = null, max = undefined) {
    return {
      where: (field, op, value) => queryRef(colPath, [...filters, [field, op, value]], order, max),
      orderBy: (field, dir = "asc") => queryRef(colPath, filters, { field, dir }, max),
      limit: (n) => queryRef(colPath, filters, order, n),
      get: async () => runQuery(colPath, filters, order, max),
      count: () => ({ get: async () => ({ data: () => ({ count: runQuery(colPath, filters, order, undefined).size }) }) }),
    };
  }

  function collectionRef(colPath) {
    return { ...queryRef(colPath), doc: (id) => docRef(`${colPath}/${id ?? newId()}`) };
  }

  async function runTransaction(fn) {
    const run = lock.then(async () => {
      const writes = [];
      const tx = {
        get: async (target) => (target.path !== undefined ? snapshotOf(target.path) : target.get()),
        set: (ref, data) => writes.push({ kind: "set", path: ref.path, data }),
        update: (ref, data) => writes.push({ kind: "update", path: ref.path, data }),
        delete: (ref) => writes.push({ kind: "delete", path: ref.path }),
      };
      const result = await fn(tx); // if fn throws, nothing is applied
      for (const w of writes) {
        if (w.kind === "delete") store.delete(w.path);
        else if (w.kind === "set") store.set(w.path, clone(w.data));
        else store.set(w.path, { ...store.get(w.path), ...clone(w.data) });
      }
      stats.commits += 1;
      stats.lastWrites = writes.map((w) => w.path);
      return result;
    });
    lock = run.catch(() => {});
    return run;
  }

  return {
    doc: docRef,
    collection: collectionRef,
    collectionGroup: (name) => ({
      where: (field, op, value) => ({
        limit: () => ({
          get: async () => {
            const docs = [...store.keys()].filter((p) => segments(p).at(-2) === name).map(snapshotOf).filter((s) => s.data()[field] === value);
            return { docs, empty: docs.length === 0, size: docs.length };
          },
        }),
      }),
    }),
    runTransaction,
    stats,
    _store: store,
    _all: (prefix) => [...store.keys()].filter((p) => p.startsWith(prefix)),
  };
}

export function createFakeAuth(users = {}) {
  return {
    getUser: async (uid) => {
      if (!users[uid]) throw Object.assign(new Error("not found"), { code: "auth/user-not-found" });
      return { uid, ...users[uid] };
    },
    getUserByEmail: async (email) => {
      const entry = Object.entries(users).find(([, u]) => u.email === email);
      if (!entry) throw Object.assign(new Error("not found"), { code: "auth/user-not-found" });
      return { uid: entry[0], ...entry[1] };
    },
    getUsers: async (ids) => ({
      users: ids.filter(({ uid }) => users[uid]).map(({ uid }) => ({ uid, ...users[uid] })),
    }),
  };
}
