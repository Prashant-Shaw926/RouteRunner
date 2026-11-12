export interface MockServerOptions { failureRate: number; minDelayMs: number; maxDelayMs: number; random?: () => number; sleep?: (ms: number) => Promise<void>; }
export class MockServer {
  private applied = new Set<string>();      // S5 dedupe by requestId
  public offline = false;                   // S6
  constructor(public opts: MockServerOptions = { failureRate: 0.3, minDelayMs: 1000, maxDelayMs: 3000 }) {}
  async send(action: { requestId: string }): Promise<{ applied: boolean }> { throw new Error('TODO S5/S6'); }
  setFailureRate(r: number) { this.opts.failureRate = r; }  // tests force 0 or 1
}
