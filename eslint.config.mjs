import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      ".claude/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
    ],
  },
];

export default eslintConfig;
