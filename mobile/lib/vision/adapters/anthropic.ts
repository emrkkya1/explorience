import type { VisionAdapter } from '../types';

// Skeleton — implement when Anthropic vision support is requested.
export const anthropicAdapter: VisionAdapter = {
  async compareImages() {
    throw new Error('Anthropic vision adapter not implemented yet');
  },
};