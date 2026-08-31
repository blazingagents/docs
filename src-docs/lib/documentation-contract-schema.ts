import { z } from "zod";

function arraysEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

const fenceMetadataSchema = z
  .object({
    "tab-group": z.string().optional(),
    tab: z.string().optional(),
    title: z.string().optional(),
  })
  .strict();

const presentationSchema = z
  .object({
    anchors: z
      .object({
        assignedHeadings: z.array(z.string()).optional(),
        assignedIds: z.array(z.string()),
        assignedSchemas: z.array(z.string()).optional(),
        kind: z.enum(["h2", "methods", "operations", "schemas"]),
      })
      .strict(),
    cards: z.array(z.string()),
    callout: z
      .object({
        placement: z.enum([
          "after-first-paragraph",
          "before-first-fence",
          "before-first-step",
          "inside-section",
          "section-start",
        ]),
        section: z.string().nullable(),
        title: z.string(),
        type: z.enum(["info", "warn"]),
      })
      .strict()
      .nullable(),
    componentCounts: z.record(z.string(), z.number().int().positive()),
    fences: z
      .object({
        endpointCurls: z.boolean(),
        items: z.array(
          z
            .object({
              language: z.string(),
              metadata: fenceMetadataSchema,
            })
            .strict()
        ),
      })
      .strict(),
    file: z.string().regex(/\.(?:md|mdx)$/),
    filesTree: z.array(z.string()),
    recipe: z.string().min(1),
    steps: z.array(z.string()),
  })
  .strict()
  .superRefine((presentation, context) => {
    if (
      presentation.file === "api-reference/protocols/objects-and-schemas.md" &&
      presentation.anchors.assignedHeadings
    ) {
      const assignedIds = presentation.anchors.assignedHeadings.map((heading) =>
        heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, "")
      );
      if (!arraysEqual(assignedIds, presentation.anchors.assignedIds)) {
        context.addIssue({
          code: "custom",
          message: "schema anchor semantics conflict",
        });
      }
    }
  });

const restEndpointSchema = z
  .object({
    method: z.enum(["DELETE", "GET", "PATCH", "POST", "PUT"]),
    operation: z.string().regex(/^[a-z0-9-]+$/),
    path: z.string().startsWith("/v1/"),
  })
  .strict();

const targetSchema = z
  .object({
    file: z.string().regex(/\.(?:md|mdx)$/),
    name: z.string().min(1),
    publishable: z.boolean(),
    title: z.string().min(1),
    url: z.string().startsWith("/"),
  })
  .strict();

export const documentationContractSchema = z
  .object({
    presentations: z.array(presentationSchema),
    restEndpoints: z.array(restEndpointSchema),
    targets: z.array(targetSchema),
  })
  .strict()
  .superRefine((contract, context) => {
    const unique = (values: string[], identity: string) => {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `Duplicate ${identity}`,
        });
      }
    };
    unique(
      contract.targets.map(({ file }) => file),
      "target file"
    );
    unique(
      contract.targets.map(({ url }) => url),
      "target URL"
    );
    unique(
      contract.presentations.map(({ file }) => file),
      "presentation file"
    );
    unique(
      contract.restEndpoints.map(({ method, path }) => `${method} ${path}`),
      "REST method and path"
    );
    unique(
      contract.restEndpoints.map(({ operation }) => operation),
      "REST operation"
    );
    if (
      !arraysEqual(
        contract.presentations.map(({ file }) => file),
        contract.targets.map(({ file }) => file)
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Presentation files must match target files in order",
      });
    }
  });

export type PresentationContract = z.infer<typeof presentationSchema>;
