import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { documentationContractSchema } from "./documentation-contract-schema.ts";

export type { PresentationContract } from "./documentation-contract-schema.ts";

export const documentationContract = documentationContractSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(process.cwd(), "src-docs/documentation-contract.json"),
      "utf8"
    )
  )
);
