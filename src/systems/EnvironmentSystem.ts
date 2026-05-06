import type { ParallaxBackground } from '../lib/parallaxBackground';
import type { BiomeId } from '../lib/types';
import { biomeData } from '../lib/environmentMath';

/**
 * Holds the current biome and propagates visual changes (parallax tint).
 * Per ADR-003: v0 ships the data layer + biome-tint plumbing; runtime
 * damage zones are Phase 5 work.
 */
export class EnvironmentSystem {
  private readonly parallax: ParallaxBackground;
  private currentBiome: BiomeId = 'rock';

  constructor(parallax: ParallaxBackground) {
    this.parallax = parallax;
  }

  setBiome(biome: BiomeId): void {
    if (biome === this.currentBiome) return;
    this.currentBiome = biome;
    const data = biomeData(biome);
    this.parallax.setBiomeTint(data.tint);
  }

  biome(): BiomeId {
    return this.currentBiome;
  }
}
