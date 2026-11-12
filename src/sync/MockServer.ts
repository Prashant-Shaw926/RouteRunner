export interface MockServerOptions { failureRate: number; minDelayMs: number; maxDelayMs: number; random?: () => number; sleep?: (ms: number) => Promise<void>; }
export class NetworkError extends Error {
  readonly code = 'NETWORK_ERROR';

  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class MockServer {
  private applied = new Set<string>();      // S5 dedupe by requestId
  private inFlight = new Map<string, Promise<{ applied: boolean }>>();
  public offline = false;                   // S6
  public appliedLog: string[] = [];
  constructor(public opts: MockServerOptions = { failureRate: 0.3, minDelayMs: 1000, maxDelayMs: 3000 }) {}

  async send(action: { requestId: string }): Promise<{ applied: boolean }> {
    if (this.applied.has(action.requestId)) {
      return { applied: false };
    }
    const existing = this.inFlight.get(action.requestId);
    if (existing) return existing;

    const request = this.performSend(action);
    this.inFlight.set(action.requestId, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(action.requestId);
    }
  }

  private async performSend(action: { requestId: string }): Promise<{ applied: boolean }> {
    const random = this.opts.random || Math.random;
    const sleep = this.opts.sleep || ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    const delayRange = this.opts.maxDelayMs - this.opts.minDelayMs;
    const delay = this.opts.minDelayMs + Math.floor(random() * (delayRange + 1));
    await sleep(delay);

    if (this.offline || random() < this.opts.failureRate) {
      throw new NetworkError(this.offline ? 'Network is offline' : 'Network request failed');
    }

    this.applied.add(action.requestId);
    this.appliedLog.push(action.requestId);
    return { applied: true };
  }

  setFailureRate(r: number) { this.opts.failureRate = r; }  // tests force 0 or 1
}
