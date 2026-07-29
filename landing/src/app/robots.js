export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Bingbot'],
        allow: '/',
      }
    ],
    sitemap: 'https://www.journeyflowcrm.com/sitemap.xml',
  };
}
