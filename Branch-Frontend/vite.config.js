import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "mui", test: /node_modules[\\/]@mui/ },
            { name: "table", test: /node_modules[\\/](material-react-table|@tanstack)/ },
            { name: "vendor", test: /node_modules[\\/](react|react-dom|react-redux|@reduxjs|axios|yup|react-hook-form|dayjs)/ }
          ]
        }
      }
    }
  }
});