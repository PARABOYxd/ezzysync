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
      url: 'https://www.ezzysync.com/blog',
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/whatsapp-marketing-for-travel-agents',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/streamline-travel-agency-billing',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/ai-itinerary-builder-efficiency',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/convert-instagram-leads-travel-agents',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/festive-season-bookings-travel-agents',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.ezzysync.com/blog/agentic-ai-travel-agency-operations',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
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
