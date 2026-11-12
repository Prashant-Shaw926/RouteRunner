import { MockServer, NetworkError } from '../src/sync/MockServer';

const action = (requestId: string) => ({ requestId });

const serverOptions = {
  failureRate: 0,
  minDelayMs: 1000,
  maxDelayMs: 3000,
  random: () => 0,
  sleep: async () => undefined,
};

describe('MockServer', () => {
  it('always succeeds at failureRate 0 and waits within the configured delay range', async () => {
    const sleep = jest.fn(async () => undefined);
    const server = new MockServer({ ...serverOptions, sleep });

    await expect(server.send(action('req-1'))).resolves.toEqual({ applied: true });

    expect(sleep).toHaveBeenCalledWith(1000);
    expect(server.appliedLog).toEqual(['req-1']);
  });

  it('always fails at failureRate 1 with a typed NetworkError', async () => {
    const server = new MockServer({ ...serverOptions, failureRate: 1 });

    await expect(server.send(action('req-1'))).rejects.toBeInstanceOf(NetworkError);
    expect(server.appliedLog).toEqual([]);
  });

  it('fails while offline even when failureRate is 0', async () => {
    const server = new MockServer(serverOptions);
    server.offline = true;

    await expect(server.send(action('req-1'))).rejects.toBeInstanceOf(NetworkError);
    expect(server.appliedLog).toEqual([]);
  });

  it('deduplicates a repeated requestId without applying twice', async () => {
    const server = new MockServer(serverOptions);

    await expect(server.send(action('req-1'))).resolves.toEqual({ applied: true });
    await expect(server.send(action('req-1'))).resolves.toEqual({ applied: false });

    expect(server.appliedLog).toEqual(['req-1']);
  });
});
