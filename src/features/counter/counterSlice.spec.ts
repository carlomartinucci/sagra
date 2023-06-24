import counterReducer, {
  CounterState,
  // increment,
  reset
} from './counterSlice';

describe('counter reducer', () => {
  const initialState: CounterState = {
    value: 3,
    isOnline: false
  };
  it('should handle initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual({
      value: 0,
    });
  });

  // it('should handle increment', () => {
  //   const actual = counterReducer(initialState, increment());
  //   expect(actual.value).toEqual(4);
  // });

  it('should handle reset', () => {
    const actual = counterReducer(initialState, reset());
    expect(actual.value).toEqual(undefined);
  });
});
