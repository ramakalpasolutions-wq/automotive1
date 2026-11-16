/** @type {import('next').NextConfig} */

// Host of the public R2 URL (custom domain or *.r2.dev), so next/image can load it.
let r2Host = null;
try {
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    r2Host = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname;
  }
} catch {}

const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Cloudflare R2 public bucket
      { protocol: 'https', hostname: '**.r2.dev', pathname: '/**' },
      ...(r2Host ? [{ protocol: 'https', hostname: r2Host, pathname: '/**' }] : []),
      // Older images that were uploaded to Cloudinary before the switch
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
