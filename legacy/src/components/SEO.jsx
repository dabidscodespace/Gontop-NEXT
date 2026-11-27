// src/components/SEO.jsx
const SEO = ({ title, description, image, url, keywords, noindex = false }) => {
  const siteTitle = "GONTOP";
  const siteUrl = "https://gontop.app";
  const defaultImage = `${siteUrl}/og-image-new.png`;
  const defaultDescription =
    "GONTOP is Bangladesh's most trusted game top-up platform. " +
    "Buy PUBG UC, Mobile Legends Diamonds, Free Fire Diamonds and more " +
    "at the cheapest price. Instant delivery with bKash, Nagad & Rocket.";
  const defaultKeywords =
    "buy UC bangladesh, PUBG UC bd, MLBB diamonds bangladesh, " +
    "mobile legends top up, free fire diamonds bd, game top up bangladesh, " +
    "cheap UC, gontop, top up bd, bkash game top up";

  const finalTitle = title
    ? `${siteTitle} - ${title}`
    : `${siteTitle} - Best Game Top-Up Store in Bangladesh`;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = url || siteUrl;
  const finalKeywords = keywords || defaultKeywords;

  return (
    <>
      {/* Primary */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content={siteTitle} />
      <meta
        name="robots"
        content={noindex ? "noindex, nofollow" : "index, follow"}
      />

      {/* Canonical */}
      <link rel="canonical" href={finalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalTitle} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
    </>
  );
};

export default SEO;
