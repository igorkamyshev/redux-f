import { test } from "uvu";
import * as assert from "uvu/assert";
import toolkit from "@reduxjs/toolkit";
import { createDomain, restore } from "effector";

import { reduxF } from "./lib.js";

const { configureStore, createSlice } = toolkit;

export const counterSlice = createSlice({
  name: "counter",
  initialState: {
    value: 0,
  },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});

export default configureStore({
  reducer: {},
});

function assertSameValue($store, store) {
  assert.is($store.getState(), store.getState());
}

test("should update effector store for redux store", () => {
  const root = createDomain();
  const { $store, enhancer } = reduxF({ domain: root });

  const store = configureStore({
    reducer: { counter: counterSlice.reducer },
    enhancers: [enhancer],
  });
  assertSameValue($store, store);

  store.dispatch(counterSlice.actions.increment());
  assertSameValue($store, store);

  store.dispatch(counterSlice.actions.decrement());
  assertSameValue($store, store);

  store.dispatch(counterSlice.actions.incrementByAmount());
  assertSameValue($store, store);
});

test("should trigger redux update on any effector store update", () => {
  const root = createDomain();

  const doSomething = root.createEvent();
  const $anyting = restore(doSomething, 0);

  const { enhancer } = reduxF({ domain: root });

  const store = configureStore({
    reducer: { counter: counterSlice.reducer },
    enhancers: [enhancer],
  });

  let updated = 0;
  store.subscribe(() => {
    updated += 1;
  });

  doSomething(1);
  assert.is(updated, 1);
});

test.run();
