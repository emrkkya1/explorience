# Cross-Resolution Comparison Report

**Generated:** 2026-06-16T21:07:30.481Z

## Summary Comparison

| Resolution | Fetches | Unique Places | Avg Rating | Avg Reviews | Avg Quality Score |
|------------|---------|---------------|------------|-------------|-------------------|
| 3×3 | 9 | 158 | 4.57 | 9,747 | 13.30 |
| 5×5 | 25 | 397 | 4.35 | 4,317 | 9.03 |
| 8×8 | 64 | 768 | 4.00 | 2,356 | 6.92 |
| 10×10 | 100 | 923 | 3.94 | 2,017 | 6.54 |
| 12×12 | 144 | 1,104 | 3.81 | 1,742 | 6.06 |
| 15×15 | 225 | 1,266 | 3.81 | 1,592 | 5.97 |

## Overlap Analysis

Places shared between resolutions:

| Pair | Shared Places | % of Smaller Set |
|------|---------------|------------------|
| R3 ∩ R5 | 141 | 89.2% |
| R3 ∩ R8 | 150 | 94.9% |
| R3 ∩ R10 | 154 | 97.5% |
| R3 ∩ R12 | 156 | 98.7% |
| R3 ∩ R15 | 155 | 98.1% |
| R5 ∩ R8 | 360 | 90.7% |
| R5 ∩ R10 | 375 | 94.5% |
| R5 ∩ R12 | 380 | 95.7% |
| R5 ∩ R15 | 381 | 96.0% |
| R8 ∩ R10 | 712 | 92.7% |
| R8 ∩ R12 | 727 | 94.7% |
| R8 ∩ R15 | 753 | 98.0% |
| R10 ∩ R12 | 888 | 96.2% |
| R10 ∩ R15 | 901 | 97.6% |
| R12 ∩ R15 | 1,060 | 96.0% |

## Incremental Value

New places found at each resolution (not in the previous resolution):

| Resolution | New Places | % of Total | Cumulative |
|------------|------------|------------|------------|
| 3×3 | 158 | 100.0% | 158 |
| 5×5 | 256 | 64.5% | 414 |
| 8×8 | 408 | 53.1% | 822 |
| 10×10 | 211 | 22.9% | 1,033 |
| 12×12 | 216 | 19.6% | 1,249 |
| 15×15 | 206 | 16.3% | 1,455 |

## Diminishing Returns Analysis

| Resolution | Places/Fetch | Efficiency Ratio |
|------------|--------------|------------------|
| 3×3 | 17.6 | 100.0% |
| 5×5 | 15.9 | 90.5% |
| 8×8 | 12.0 | 68.4% |
| 10×10 | 9.2 | 52.6% |
| 12×12 | 7.7 | 43.7% |
| 15×15 | 5.6 | 32.1% |

**Interpretation:** As resolution increases, each fetch returns fewer unique places due to overlap and smaller search areas.
