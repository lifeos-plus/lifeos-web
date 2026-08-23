import { readFile, writeFile } from "node:fs/promises";

import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import ts from "typescript";

const inputPath = new URL("../openapi.json", import.meta.url);
const outputPath = new URL("../src/services/api/generated/schema.ts", import.meta.url);
let document;
try {
  const overridePath = process.env.LIFEOS_CLI_SCHEMA_PATH;
  document = JSON.parse(
    overridePath ? await readFile(overridePath, "utf8") : await readFile(inputPath, "utf8"),
  );
} catch (error) {
  console.error(
    "No readable OpenAPI document. Either fetch the pinned release document " +
      "with `npm run api:refresh`, or set LIFEOS_CLI_SCHEMA_PATH to a locally " +
      "exported openapi.json for pre-release development.",
  );
  process.exit(1);
}

const ast = await openapiTS(document, {
  defaultNonNullable: false,
  inject: `export type JsonValue =
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue }
  | null;`,
  transform(_schema, options) {
    if (options.path === "#/components/schemas/JsonValue") {
      return ts.factory.createTypeReferenceNode("JsonValue");
    }
    return undefined;
  },
});

await writeFile(outputPath, `${COMMENT_HEADER}${astToString(ast)}`, "utf8");
