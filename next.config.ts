import type { NextConfig } from "next";

// Card photos live in Supabase Storage and profile avatars come from Google.
// Both hosts must be allowlisted for next/image, which is also what keeps
// repeat binder views on Vercel's CDN instead of Supabase's 5 GB egress.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

export default nextConfig;
