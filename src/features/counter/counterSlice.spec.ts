import counterReducer, {
  CounterState,
  increment,
  reset
} from './counterSlice';
import { doc, runTransaction } from '@firebase/firestore/lite';

jest.mock('@firebase/firestore/lite', () => ({
  doc: jest.fn(),
  runTransaction: jest.fn(),
}));

describe('counter reducer', () => {
  const initialState: CounterState = {
    value: 3,
    isOnline: false
  };
  it('should handle initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual({
      value: undefined,
      isOnline: true,
    });
  });

  it('should handle reset', () => {
    const actual = counterReducer(initialState, reset());
    expect(actual.value).toEqual(undefined);
  });
});

describe('increment thunk', () => {
  beforeEach(() => {
    // CRA's jest config has resetMocks: true, so re-arm implementations here.
    (doc as jest.Mock).mockReturnValue('sagra-doc-ref');
    window.localStorage.clear();
  });

  it('reads and writes the counter inside a single transaction (no duplicate numbers across tills)', async () => {
    const update = jest.fn();
    (runTransaction as jest.Mock).mockImplementation(async (_firestore, txFn) =>
      txFn({
        get: async () => ({ get: (field: string) => (field === 'count' ? 4481 : undefined) }),
        update,
      })
    );

    const action = await (increment('fake-firestore') as any)(jest.fn(), jest.fn(), undefined);

    expect(action.payload).toEqual({ value: 4481, isOnline: true });
    expect(update).toHaveBeenCalledWith('sagra-doc-ref', { count: 4482 });
  });

  it('falls back to the localStorage counter when Firestore is unreachable', async () => {
    (runTransaction as jest.Mock).mockRejectedValue(new Error('offline'));
    window.localStorage.setItem('count', '123');

    const action = await (increment('fake-firestore') as any)(jest.fn(), jest.fn(), undefined);

    expect(action.payload).toEqual({ value: 123, isOnline: false });
    expect(window.localStorage.getItem('count')).toBe('124');
  });
});
