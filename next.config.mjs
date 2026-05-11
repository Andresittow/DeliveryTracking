/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true, // Ignora errores de TypeScript en el build
  },
  eslint: {
    ignoreDuringBuilds: true, // Ignora errores de ESLint en el build
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig