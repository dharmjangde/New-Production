/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ["jspdf", "jspdf-autotable"],
  experimental: {
    turbo: {
      resolveAlias: {
        fflate: "fflate/browser",
        jspdf: "jspdf/dist/jspdf.es.min.js",
      },
    },
  },
}

export default nextConfig
