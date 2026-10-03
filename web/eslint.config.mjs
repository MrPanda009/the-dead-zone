import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Claims the Stats dashboard must not make.
 *
 * The flood layer is an empirical susceptibility screen built from Sentinel-1 inundation
 * frequency and HAND. It has not been calibrated, cross-validated or checked against ground
 * truth, and it is not hydrodynamic. Wording about the model lives in `lib/stats/copy.ts`;
 * a literal that trips this rule is almost always a claim the pipeline cannot back.
 */
const FORBIDDEN_STATS_COPY =
  "calibrat|cross-?valid|ground.?truth|hydro-?dem|hydrodynamic|TERRA v|FABDEM|84[.]2|verified|high-fidelity";

const forbiddenStatsCopyMessage =
  "This wording makes a claim the flood model cannot back (calibrated, cross-validated, ground truth, hydrodynamic, an agreement figure). Use lib/stats/copy.ts, or describe only what the data shows.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["components/features/stats/**/*.{ts,tsx}", "lib/stats/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${FORBIDDEN_STATS_COPY}/i]`, message: forbiddenStatsCopyMessage },
        { selector: `JSXText[value=/${FORBIDDEN_STATS_COPY}/i]`, message: forbiddenStatsCopyMessage },
        { selector: `TemplateElement[value.raw=/${FORBIDDEN_STATS_COPY}/i]`, message: forbiddenStatsCopyMessage },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
  ]),
]);

export default eslintConfig;
