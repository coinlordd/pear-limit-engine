export type Listener<T = any> = (payload: T) => void

export class Emitter {
  private m = new Map<string, Set<Listener>>()
  on<T = any>(event: string, fn: Listener<T>) {
    if (!this.m.has(event)) this.m.set(event, new Set())
    this.m.get(event)!.add(fn as Listener)
    return () => this.off(event, fn)
  }
  once<T = any>(event: string, fn: Listener<T>) {
    const off = this.on<T>(event, (p) => {
      off()
      fn(p)
    })
    return off
  }
  off<T = any>(event: string, fn: Listener<T>) {
    this.m.get(event)?.delete(fn as Listener)
  }
  emit<T = any>(event: string, payload: T) {
    this.m.get(event)?.forEach((fn) => fn(payload))
  }
}
