import {
  clearNode,
  step,
  createNode,
  scopeBind,
  createStore,
  createEvent,
  combine,
} from "effector";

const fAction = Symbol("f");
const fField = Symbol("f");

function createBoundEvent(event, scope) {
  if (!scope) {
    return event;
  }

  return scopeBind(event, {
    scope,
  });
}

// Copy-paste from effector-react =(
export function createBoundWatch(store, fn, scope) {
  const seq = [step.run({ fn: (value) => fn(value) })];
  if (scope) {
    const node = createNode({ node: seq });
    const id = store.graphite.id;
    const scopeLinks = scope.additionalLinks;
    const links = scopeLinks[id] || [];
    scopeLinks[id] = links;
    links.push(node);
    return () => {
      const idx = links.indexOf(node);
      if (idx !== -1) links.splice(idx, 1);
      clearNode(node);
    };
  } else {
    const node = createNode({
      node: seq,
      parent: [store],
      family: { owners: store },
    });
    return () => {
      clearNode(node);
    };
  }
}

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

  const updateEffectorStoreBound = createBoundEvent(
    updateEffectorStore,
    config.scope
  );

  function enhancer(creator) {
    return function (reducer) {
      function newReducer(state, action) {
        // Just copy store to trigger re-renders
        if (action.type === fAction) {
          return { ...state, [fField]: (state[fField] ?? 0) + 1 };
        }

        return reducer(state, action);
      }

      const reduxStore = creator(newReducer);

      // Sync from redux to effector
      // on every dispatch
      reduxStore.subscribe(() => {
        updateEffectorStoreBound(reduxStore.getState());
      });
      // and for igaanitial state
      updateEffectorStoreBound(reduxStore.getState());

      // Sync from effector to redux
      if (effectorMegaStore) {
        createBoundWatch(
          effectorMegaStore,
          () => {
            reduxStore.dispatch({ type: fAction, payload: null });
          },
          config.scope
        );
      }

      return reduxStore;
    };
  }

  return {
    enhancer,
    select: (selector) => $effectorStore.map(selector),
  };
};

export { reduxF };
