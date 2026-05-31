/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  generateRobotsTxt: false, // robots.txt is handled by src/app/robots.ts
  exclude: ["/admin/*", "/admin", "/shop-manager/*", "/support/*", "/api/*"],
  outDir: "./public",
};
