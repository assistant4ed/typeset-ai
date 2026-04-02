import { describe, it, expect } from "vitest";
import { buildDesignMapXml } from "@typeset-ai/core/idml/designmap-builder.js";

describe("buildDesignMapXml", () => {
  it("should produce a valid designmap.xml with spreads and stories", () => {
    const xml = buildDesignMapXml({
      spreadIds: ["spread-1", "spread-2"],
      storyIds: ["story-1", "story-2"],
    });

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("Document");
    expect(xml).toContain("idPkg:Spread");
    expect(xml).toContain("idPkg:Story");
    expect(xml).toContain('src="Spreads/spread-1.xml"');
    expect(xml).toContain('src="Spreads/spread-2.xml"');
    expect(xml).toContain('src="Stories/story-1.xml"');
    expect(xml).toContain('src="Stories/story-2.xml"');
  });

  it("should reference Styles.xml and Graphic.xml", () => {
    const xml = buildDesignMapXml({
      spreadIds: ["spread-1"],
      storyIds: ["story-1"],
    });

    expect(xml).toContain('src="Resources/Styles.xml"');
    expect(xml).toContain('src="Resources/Graphic.xml"');
  });

  it("should include Preferences and BackingStory elements", () => {
    const xml = buildDesignMapXml({
      spreadIds: [],
      storyIds: [],
    });

    expect(xml).toContain("idPkg:Preferences");
    expect(xml).toContain("idPkg:BackingStory");
  });
});
