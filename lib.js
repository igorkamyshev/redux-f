import { scopeBind, createStore, createEvent, combine } from "effector";

const fAction = Symbol("f");
const fField = Symbol("f");

const reduxF = (config) => {
  const $effectorStore = createStore(null);
  const updateEffectorStore = createEvent();
  $effectorStore.on(updateEffectorStore, (_, state) => state);

  const effectorStores = [];
  config.domain.onCreateStore((store) => effectorStores.push(store));
  let effectorMegaStore = null;
  if (effectorStores.length > 0) {
    effectorMegaStore = combine(...effectorStores);
  }

  let updateEffectorStoreBound;
  if (config.scope) {
    updateEffectorStoreBound = scopeBind(updateEffectorStore, {
      scope: config.scope,
    });
  }
  updateEffectorStoreBound = updateEffectorStore;

  function enhancer(creator) {
    return function (reducer) {
      function newReducer(state, action) {
        // Just copy store to trigger re-renders
        if (action.type === fAction) {
          return { ...state, [fField]: (state[fField] ?? 0) + 1 };
        }

        return reducer(state, action);
      }

      const store = creator(newReducer);

      // Sync from redux to effector
      // on every dispatch
      store.subscribe(() => {
        updateEffectorStoreBound(store.getState());
      });
      // and for igaanitial state
      updateEffectorStoreBound(store.getState());

      // Sync from effector to redux
      if (effectorMegaStore) {
        effectorMegaStore.updates.watch(() => {
          store.dispatch({ type: fAction, payload: null });
        });
      }

      return store;
    };
  }

  return {
    enhancer,
    select: (selector) => $effectorStore.map(selector),
  };
};

export { reduxF };
