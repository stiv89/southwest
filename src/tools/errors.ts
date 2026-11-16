export interface ToolContext {
  outageTool: string | null;
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

export function assertNoOutage(ctx: ToolContext, name: string): void {
  if (ctx.outageTool === name) {
    throw new ToolError(`${name} failed: simulated data outage. No result was produced.`);
  }
}
