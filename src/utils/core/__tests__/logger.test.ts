import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/utils/core";

describe("logger", () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("logs every level in development", () => {
    logger.debug("d", 1);
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(debugSpy).toHaveBeenCalledWith("[DEBUG]", "d", 1);
    expect(infoSpy).toHaveBeenCalledWith("[INFO]", "i");
    expect(warnSpy).toHaveBeenCalledWith("[WARN]", "w");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR]", "e");
  });

  it("restricts output to warn and error in production without debug", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_ENABLE_DEBUG", "false");
    vi.resetModules();
    const { logger: prodLogger } = await import("@/utils/core");

    prodLogger.debug("d");
    prodLogger.info("i");
    prodLogger.warn("w");
    prodLogger.error("e");

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[WARN]", "w");
    expect(errorSpy).toHaveBeenCalledWith("[ERROR]", "e");
  });

  it("enables all levels in production when debug is explicitly enabled", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_ENABLE_DEBUG", "true");
    vi.resetModules();
    const { logger: prodLogger } = await import("@/utils/core");

    prodLogger.debug("d");
    prodLogger.info("i");
    prodLogger.warn("w");
    prodLogger.error("e");

    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });
});
