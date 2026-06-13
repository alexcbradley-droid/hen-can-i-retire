// Projections cached per scenario version so toggling/comparing never
// recomputes a plan that hasn't changed. Bounded by evicting stale versions.

import { fullProjection } from './engine/solvers';
import { ProjectionResult, Scenario } from './engine/types';

const cache = new Map<string, ProjectionResult>();

export function cachedProjection(s: Scenario): ProjectionResult {
  const key = `${s.id}:${s.updatedAt}`;
  let r = cache.get(key);
  if (!r) {
    r = fullProjection(s);
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(s.id + ':')) cache.delete(k); // drop stale versions
    }
    cache.set(key, r);
  }
  return r;
}
