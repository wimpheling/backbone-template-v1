import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const viteDevServerPort = process.env["VITE_DEV_SERVER_PORT"]
const devServerPort =
  viteDevServerPort === undefined || viteDevServerPort === ""
    ? undefined
    : Number(viteDevServerPort)

export default defineConfig({
  plugins: [react()],
  server:
    devServerPort === undefined
      ? {
          host: "127.0.0.1",
        }
      : {
          host: "127.0.0.1",
          port: devServerPort,
        },
})
