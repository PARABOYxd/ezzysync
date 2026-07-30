export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      url: 'https://www.ezzysync.com',
      lastModified,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: 'https://www.ezzysync.com/features',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.ezzysync.com/pricing',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://www.ezzysync.com/about',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: 'https://www.ezzysync.com/contact',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: 'https://www.ezzysync.com/terms',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.ezzysync.com/privacy',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://www.ezzysync.com/refund-policy',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
