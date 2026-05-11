/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // <-- ESTO ES VITAL PARA DEPLOY EN NGINX
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig