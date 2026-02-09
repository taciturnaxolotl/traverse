import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { join } from "path";

// Load Inter font files (woff, not woff2 — satori doesn't support woff2)
const fontsDir = join(import.meta.dir, "../node_modules/@fontsource/inter/files");
const [interRegular, interBold] = await Promise.all([
  Bun.file(join(fontsDir, "inter-latin-400-normal.woff")).arrayBuffer(),
  Bun.file(join(fontsDir, "inter-latin-700-normal.woff")).arrayBuffer(),
]);

// Initialize resvg-wasm
const wasmPath = join(import.meta.dir, "../node_modules/@resvg/resvg-wasm/index_bg.wasm");
await initWasm(Bun.file(wasmPath).arrayBuffer());

// Cache generated images by diagram ID
const cache = new Map<string, Buffer>();

export async function generateOgImage(
  id: string,
  summary: string,
  nodeNames: string[],
): Promise<Buffer> {
  const cached = cache.get(id);
  if (cached) return cached;

  const nodeCount = nodeNames.length;
  const displayNodes = nodeNames.slice(0, 8);
  const extra = nodeCount > 8 ? nodeCount - 8 : 0;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          backgroundColor: "#0a0a0a",
          color: "#e5e5e5",
          fontFamily: "Inter",
        },
        children: [
          // Top: Traverse label
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "#a3a3a3",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase" as const,
                    },
                    children: "Traverse",
                  },
                },
              ],
            },
          },
          // Middle: Summary headline
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                flex: 1,
                justifyContent: "center",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: summary.length > 60 ? "36px" : "44px",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      color: "#e5e5e5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                    children: summary,
                  },
                },
              ],
            },
          },
          // Bottom: Node pills + count
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                      flex: 1,
                    },
                    children: [
                      ...displayNodes.map((name) => ({
                        type: "div",
                        props: {
                          style: {
                            fontSize: "14px",
                            color: "#a3a3a3",
                            backgroundColor: "#1c1c1e",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid #262626",
                          },
                          children: name,
                        },
                      })),
                      ...(extra > 0
                        ? [
                            {
                              type: "div",
                              props: {
                                style: {
                                  fontSize: "14px",
                                  color: "#666",
                                  padding: "4px 8px",
                                },
                                children: `+${extra} more`,
                              },
                            },
                          ]
                        : []),
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "16px",
                      color: "#666",
                      flexShrink: 0,
                    },
                    children: `${nodeCount} node${nodeCount !== 1 ? "s" : ""}`,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: interRegular, weight: 400, style: "normal" as const },
        { name: "Inter", data: interBold, weight: 700, style: "normal" as const },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  const png = Buffer.from(resvg.render().asPng());

  cache.set(id, png);
  return png;
}
