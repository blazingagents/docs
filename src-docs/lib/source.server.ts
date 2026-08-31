import { loader } from "fumadocs-core/source";
import { docs } from "../../.source/server.ts";

/**
 * The single authoritative view of the documentation corpus. Consumers must
 * use this loader for navigation, routes, table of contents, and search input
 * so those representations cannot drift apart.
 */
export const source = loader({
  baseUrl: "/",
  source: docs.toFumadocsSource(),
});

export type DocsPage = (typeof source)["$inferPage"];
