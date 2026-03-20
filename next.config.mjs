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
        "fflate/lib/node.cjs": "fflate/browser",
        "fflate": "fflate/browser",
        "jspdf": "jspdf/dist/jspdf.es.min.js",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      fflate: "fflate/browser",
    }
    return config
  },
}

export default nextConfig
