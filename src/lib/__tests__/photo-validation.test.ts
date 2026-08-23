import { describe, expect, it } from "vitest";

import {
  MAX_IMAGES_PER_LISTING,
  validateFileSize,
  validateFileType,
  validatePhotos,
} from "../photo-validation";

describe("validateFileType", () => {
  it("accepts jpg, png, and webp", () => {
    expect(validateFileType("image/jpeg")).toBe(true);
    expect(validateFileType("image/png")).toBe(true);
    expect(validateFileType("image/webp")).toBe(true);
  });

  it("rejects other types", () => {
    expect(validateFileType("text/html")).toBe(false);
    expect(validateFileType("image/gif")).toBe(false);
  });
});

describe("validatePhotos", () => {
  it("rejects an oversized file", () => {
    const files = [{ name: "big.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 }];
    expect(validatePhotos(files).size).toBeTruthy();
  });

  it("rejects an invalid file type", () => {
    const files = [{ name: "evil.html", type: "text/html", size: 100 }];
    expect(validatePhotos(files).type).toBeTruthy();
  });

  it("rejects too many files", () => {
    const files = Array.from({ length: MAX_IMAGES_PER_LISTING + 1 }, () => ({
      name: "p.jpg",
      type: "image/jpeg",
      size: 1000,
    }));
    expect(validatePhotos(files).count).toBeTruthy();
  });

  it("accepts a valid set", () => {
    const files = [{ name: "p.jpg", type: "image/jpeg", size: 1000 }];
    expect(validatePhotos(files)).toEqual({});
  });

  it("accepts size limits at the boundary", () => {
    expect(validateFileSize(5 * 1024 * 1024)).toBe(true);
    expect(validateFileSize(5 * 1024 * 1024 + 1)).toBe(false);
  });
});
