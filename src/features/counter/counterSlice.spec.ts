import counterReducer, {
  CounterState,
  increment,
  set
} from './counterSlice';

describe('counter reducer', () => {
  const initialState: CounterState = {
    value: 3,
  };
  it('should handle initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual({
      value: 0,
    });
  });

  it('should handle increment', () => {
    const actual = counterReducer(initialState, increment());
    expect(actual.value).toEqual(4);
  });

  it('should handle set', () => {
    const actual = counterReducer(initialState, set(42));
    expect(actual.value).toEqual(42);
  });
});
