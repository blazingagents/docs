import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from "fumadocs-ui/components/codeblock";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { Step, Steps } from "fumadocs-ui/components/steps";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ApiReferenceHeading, ApiReferenceTable } from "./api-reference.tsx";
import { ApiReferenceSectionHeading } from "./api-response-details.tsx";

export const authoredMdxComponents = {
  Callout,
  Card,
  Cards,
  File,
  Files,
  Folder,
  Step,
  Steps,
};

export const mdxComponents = {
  ...defaultMdxComponents,
  ...authoredMdxComponents,
  h1: () => null,
  h3: ApiReferenceHeading,
  h4: ApiReferenceSectionHeading,
  table: ApiReferenceTable,
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
};
