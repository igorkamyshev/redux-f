import { test } from "uvu";
import * as assert from "uvu/assert";
import toolkit from "@reduxjs/toolkit";
import { allSettled, createDomain, fork, restore } from "effector";

import { reduxF } from "./lib.js";

const { configureStore, createSlice } = toolkit;

function selectCounter(state) {
  return state?.counter?.value ?? null;
}

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

test("should update effector store for redux store", () => {
  const root = createDomain();
  const { select, enhancer } = reduxF({ domain: root });
  const $counter = select(selectCounter);

  const store = configureStore({
    reducer: { counter: counterSlice.reducer },
    enhancers: [enhancer],
  });
  assert.is($counter.getState(), selectCounter(store.getState()));

  store.dispatch(counterSlice.actions.increment());
  assert.is($counter.getState(), selectCounter(store.getState()));

  store.dispatch(counterSlice.actions.decrement());
  assert.is($counter.getState(), selectCounter(store.getState()));

  store.dispatch(counterSlice.actions.incrementByAmount(5));
  assert.is($counter.getState(), selectCounter(store.getState()));
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

test("should react only on particular scope", async () => {
  const root = createDomain();

  const doSomething = root.createEvent();
  const $anyting = restore(doSomething, 0);

  const scope1 = fork();
  const scope2 = fork();

  const { enhancer } = reduxF({ domain: root, scope: scope1 });

  const store = configureStore({
    reducer: { counter: counterSlice.reducer },
    enhancers: [enhancer],
  });

  let updated = 0;
  store.subscribe(() => {
    updated += 1;
  });

  await allSettled(doSomething, { params: 1, scope: scope1 });
  assert.is(updated, 1);

  await allSettled(doSomething, { params: 2, scope: scope2 });
  assert.is(updated, 1);
});

test.run();
