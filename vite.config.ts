import react from "@vitejs/plugin-react";
// test セクションを型で受けられるように vitest 側の defineConfig を使う
import { defineConfig } from "vitest/config";

// Cloudflare Pages はプロジェクトのドメイン直下（/）で配信する。
export default defineConfig({
  base: "/",
  plugins: [react()],
  test: {
    // 既定は node。DOM が必要なテストはファイル先頭で @vitest-environment jsdom を宣言する
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
