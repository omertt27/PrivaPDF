import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/success"],   // no need to index the post-payment page
      },
    ],
    sitemap: "https://privapdf.com/sitemap.xml",
  };
}
