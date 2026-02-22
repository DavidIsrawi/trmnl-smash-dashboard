import "dotenv/config";
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: {
    "https://api.smash.gg/gql/alpha": {
      headers: {
        Authorization: `Bearer ${process.env.STARTGG_TOKEN}`,
      },
    },
  },
  documents: "src/queries/**/*.ts",
  generates: {
    "src/gql/graphql.ts": {
      plugins: ["typescript", "typescript-operations"],
    },
  },
};

export default config;
