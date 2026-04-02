import { IDPKG_NAMESPACE } from "./constants.js";

export interface DesignMapOptions {
  spreadIds: string[];
  storyIds: string[];
}

export function buildDesignMapXml(options: DesignMapOptions): string {
  const spreadRefs = options.spreadIds
    .map((id) => `  <idPkg:Spread src="Spreads/${id}.xml" />`)
    .join("\n");

  const storyRefs = options.storyIds
    .map((id) => `  <idPkg:Story src="Stories/${id}.xml" />`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Document xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    ` DOMVersion="19.1"`,
    ` Self="d">`,
    `  <idPkg:Preferences src="Resources/Preferences.xml" />`,
    `  <idPkg:Styles src="Resources/Styles.xml" />`,
    `  <idPkg:Graphic src="Resources/Graphic.xml" />`,
    `  <idPkg:BackingStory src="Resources/BackingStory.xml" />`,
    spreadRefs,
    storyRefs,
    `</Document>`,
  ].join("\n");
}
