import fs from "fs";
import path from "path";
import { LLMClient } from "../clients/llm_client";
import { logger } from "../utils/logging";
import { createStage } from "./stage_registry";
import { PipelineConfig, Place, RawPlace, Stage } from "./types";

export class Pipeline {
  private stages: Stage[] = [];
  private runId: string;

  constructor(
    private config: PipelineConfig,
    private llmClient?: LLMClient,
    private saveIntermediate: boolean = true,
  ) {
    this.runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.initializeStages();
  }

  private initializeStages() {
    for (const stageConfig of this.config.stages) {
      if (!stageConfig.enabled) {
        logger.debug(`Skipping ${stageConfig.name} (disabled in config)`);
        continue;
      }

      const stage = createStage(stageConfig.name, this.llmClient);
      if (stage) {
        this.stages.push(stage);
      } else {
        logger.warn(`Unknown stage: ${stageConfig.name}`);
      }
    }
  }

  async run(initialPlaces: RawPlace[]): Promise<(RawPlace | Place)[]> {
    let places: (RawPlace | Place)[] = initialPlaces;

    logger.info(`Starting pipeline for ${this.config.city}`, {
      initial: places.length,
      target: this.config.targetCount,
      stages: this.stages.length,
    });

    if (this.saveIntermediate) {
      this.saveSnapshot("00-initial", places);
    }

    for (const stage of this.stages) {
      const before = places.length;
      logger.stageHeader(stage.name);
      places = await stage.run(places, this.config);
      const after = places.length;

      logger.stage(stage.name, before, after);

      if (this.saveIntermediate) {
        this.saveSnapshot(`01-${stage.name}`, places);
      }
    }

    logger.info(`Pipeline complete`, { final: places.length });

    if (this.saveIntermediate) {
      this.saveSnapshot("99-final", places);
    }

    return places;
  }

  private saveSnapshot(name: string, places: (RawPlace | Place)[]) {
    const outputDir = path.join(
      "output",
      "pipeline",
      this.config.city.toLowerCase(),
    );
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestampedName = `${name}_${this.runId}`;
    const filePath = path.join(outputDir, `${timestampedName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(places, null, 2));
    logger.debug(`Saved snapshot: ${timestampedName}`, { places: places.length });
  }
}
