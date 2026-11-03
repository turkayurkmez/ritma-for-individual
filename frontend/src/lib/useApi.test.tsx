import { act, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { ApiError } from '../api/client';
import { useApi } from './useApi';

function Probe({ fetcher, dep = 0 }: { fetcher: () => Promise<string>; dep?: number }) {
  const { data, loading, error, reload } = useApi(fetcher, [dep]);
  return (
    <div>
      <p data-testid="state">{loading ? 'loading' : error ? `error:${error.message}` : `data:${data}`}</p>
      <button onClick={reload}>reload</button>
    </div>
  );
}

const state = () => screen.getByTestId('state').textContent;

test('goes from loading to data', async () => {
  render(<Probe fetcher={async () => 'merhaba'} />);
  expect(state()).toBe('loading');
  await waitFor(() => expect(state()).toBe('data:merhaba'));
});

test('puts a failure into error', async () => {
  render(<Probe fetcher={async () => { throw new ApiError(500, 'server_error', 'Bir sorun oluştu.'); }} />);
  await waitFor(() => expect(state()).toBe('error:Bir sorun oluştu.'));
});

test('reload calls the fetcher again', async () => {
  const fetcher = vi.fn(async () => 'x');
  render(<Probe fetcher={fetcher} />);
  await waitFor(() => expect(state()).toBe('data:x'));
  act(() => screen.getByText('reload').click());
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});

test('ignores a late old response when a newer call has resolved', async () => {
  const resolvers: Record<string, (v: string) => void> = {};
  const fetcherFor = (key: string) => () => new Promise<string>((resolve) => { resolvers[key] = resolve; });
  function Harness() {
    const [dep, setDep] = useState(0);
    return (
      <>
        <button onClick={() => setDep(1)}>next</button>
        <Probe fetcher={fetcherFor(String(dep))} dep={dep} />
      </>
    );
  }
  render(<Harness />);
  act(() => screen.getByText('next').click());
  await act(async () => { resolvers['1']('yeni'); });
  await waitFor(() => expect(state()).toBe('data:yeni'));
  await act(async () => { resolvers['0']('eski'); });
  expect(state()).toBe('data:yeni');
});
