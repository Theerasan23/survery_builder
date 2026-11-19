/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    // Login and admin pages must never be framed (clickjacking). Public /form pages are left embeddable.
    const secureHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ];
    return [
      { source: '/login', headers: secureHeaders },
      { source: '/admin/:path*', headers: secureHeaders },
    ];
  },
};

export default nextConfig;
