import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { copyToClipboardWithMessages } from "@/utils/core";

describe("copyToClipboardWithMessages", () => {
  const writeTextMock = vi.fn();
  const execCommandMock = vi.fn();
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeTextMock.mockReset();
    execCommandMock.mockReset();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    Object.defineProperty(document, "execCommand", {
      value: execCommandMock,
      configurable: true,
      writable: true,
    });
    vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementation(
      () => {},
    );
    vi.spyOn(
      HTMLTextAreaElement.prototype,
      "setSelectionRange",
    ).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies through the modern clipboard API", async () => {
    writeTextMock.mockResolvedValue(undefined);

    const result = await copyToClipboardWithMessages("hello", "Copied");

    expect(writeTextMock).toHaveBeenCalledWith("hello");
    expect(result).toEqual({
      success: true,
      message: "Copied",
    });
  });

  it("falls back to execCommand when the clipboard API is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    execCommandMock.mockReturnValue(true);

    const result = await copyToClipboardWithMessages("hello", "Copied");

    expect(execCommandMock).toHaveBeenCalledWith("copy");
    expect(result).toEqual({
      success: true,
      message: "Copied",
    });
  });

  it("requests a manual copy when every method fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });
    execCommandMock.mockReturnValue(false);

    const result = await copyToClipboardWithMessages("hello", "Copied");

    expect(result).toMatchObject({
      success: true,
      requiresManualCopy: true,
      exportText: "hello",
    });
  });

  it("returns a failure message when the clipboard API rejects", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));

    const result = await copyToClipboardWithMessages(
      "hello",
      "Copied",
      "Copy failed",
    );

    expect(result).toEqual({
      success: false,
      message: "Copy failed",
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("falls back to the default error message when none is provided", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));

    const result = await copyToClipboardWithMessages("hello", "Copied");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Copy failed");
  });
});
