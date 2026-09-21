import react from "@vitejs/plugin-react";
// test セクションを型で受けられるように vitest 側の defineConfig を使う
import { defineConfig } from "vitest/config";

// GitHub Pages は https://<user>.github.io/<repo>/ で配信されるため、
// リポジトリ名をベースパスに指定しないと JS/CSS が 404 になる。
export default defineConfig({
  base: "/dice-roll-game/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
