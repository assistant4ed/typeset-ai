import { describe, it, expect } from "vitest";
import {
  IDML_NAMESPACE,
  IDPKG_NAMESPACE,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_MARGIN,
  POINTS_PER_MM,
  MIMETYPE_CONTENT,
} from "@typeset-ai/core/idml/constants.js";

describe("IDML constants", () => {
  it("should define the IDML namespace URI", () => {
    expect(IDML_NAMESPACE).toBe("http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging");
  });

  it("should define the IDPKG namespace URI", () => {
    expect(IDPKG_NAMESPACE).toBe("http://ns.adobe.com/AdobeInDesign/idpkg/1.0");
  });

  it("should define default page dimensions in points", () => {
    expect(typeof DEFAULT_PAGE_WIDTH).toBe("number");
    expect(typeof DEFAULT_PAGE_HEIGHT).toBe("number");
    expect(DEFAULT_PAGE_WIDTH).toBeGreaterThan(0);
    expect(DEFAULT_PAGE_HEIGHT).toBeGreaterThan(0);
  });

  it("should define points-per-mm conversion factor", () => {
    expect(POINTS_PER_MM).toBeCloseTo(2.834645669, 3);
  });

  it("should define the IDML mimetype content", () => {
    expect(MIMETYPE_CONTENT).toBe("application/vnd.adobe.indesign-idml-package");
  });
});
