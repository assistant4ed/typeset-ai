import { IDPKG_NAMESPACE } from "./constants.js";

export interface TextFrameOptions {
  selfId: string;
  storyRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageFrameOptions {
  selfId: string;
  imagePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameDef {
  type: "text" | "image";
  selfId: string;
  storyRef?: string;
  imagePath?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpreadOptions {
  spreadId: string;
  pageWidth: number;
  pageHeight: number;
  frames: FrameDef[];
}

function buildPathGeometry(x: number, y: number, width: number, height: number): string {
  const x2 = x + width;
  const y2 = y + height;

  return [
    `<Properties>`,
    `  <PathGeometry>`,
    `    <GeometryPathType PathOpen="false">`,
    `      <PathPointArray>`,
    `        <PathPointType Anchor="${x} ${y}" LeftDirection="${x} ${y}" RightDirection="${x} ${y}" />`,
    `        <PathPointType Anchor="${x2} ${y}" LeftDirection="${x2} ${y}" RightDirection="${x2} ${y}" />`,
    `        <PathPointType Anchor="${x2} ${y2}" LeftDirection="${x2} ${y2}" RightDirection="${x2} ${y2}" />`,
    `        <PathPointType Anchor="${x} ${y2}" LeftDirection="${x} ${y2}" RightDirection="${x} ${y2}" />`,
    `      </PathPointArray>`,
    `    </GeometryPathType>`,
    `  </PathGeometry>`,
    `</Properties>`,
  ].join("\n");
}

export function buildTextFrame(options: TextFrameOptions): string {
  const geometry = buildPathGeometry(options.x, options.y, options.width, options.height);

  return [
    `<TextFrame Self="${options.selfId}"`,
    ` ParentStory="${options.storyRef}"`,
    ` ContentType="TextType">`,
    `  ${geometry.replace(/\n/g, "\n  ")}`,
    `</TextFrame>`,
  ].join("\n");
}

export function buildImageFrame(options: ImageFrameOptions): string {
  const geometry = buildPathGeometry(options.x, options.y, options.width, options.height);

  return [
    `<Rectangle Self="${options.selfId}"`,
    ` ContentType="GraphicType">`,
    `  ${geometry.replace(/\n/g, "\n  ")}`,
    `  <Image Self="${options.selfId}-image"`,
    `    ActualPpi="300 300">`,
    `    <Link Self="${options.selfId}-link"`,
    `      LinkResourceURI="${options.imagePath}" />`,
    `  </Image>`,
    `</Rectangle>`,
  ].join("\n");
}

export function buildSpreadXml(options: SpreadOptions): string {
  const framesXml = options.frames
    .map((frame) => {
      if (frame.type === "text") {
        return buildTextFrame({
          selfId: frame.selfId,
          storyRef: frame.storyRef ?? "",
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        });
      }
      return buildImageFrame({
        selfId: frame.selfId,
        imagePath: frame.imagePath ?? "",
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      });
    })
    .map((xml) => `      ${xml.replace(/\n/g, "\n      ")}`)
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<idPkg:Spread xmlns:idPkg="${IDPKG_NAMESPACE}"`,
    `  DOMVersion="19.1">`,
    `  <Spread Self="${options.spreadId}"`,
    `    PageCount="1"`,
    `    BindingLocation="0">`,
    `    <Page Self="${options.spreadId}-page"`,
    `      GeometricBounds="0 0 ${options.pageHeight} ${options.pageWidth}"`,
    `      Name="1"`,
    `      AppliedMaster="n" />`,
    framesXml,
    `  </Spread>`,
    `</idPkg:Spread>`,
  ].join("\n");
}
