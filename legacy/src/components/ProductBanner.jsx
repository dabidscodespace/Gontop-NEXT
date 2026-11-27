// src/components/ProductBanner.jsx
const Badge = ({ icon, label }) => {
  if (!icon || !label) return null;

  return (
    <span className="flex items-center gap-1 text-sm text-black">
      <img
        src={icon}
        className="pointer-events-none w-6 select-none"
        alt={label}
      />
      <span>{label}</span>
    </span>
  );
};

const RegionBadge = ({ icon, name }) => {
  if (!name) return null;

  return (
    <span className="ml-1 flex items-center gap-2 text-sm text-black">
      <div className="relative h-4 w-4 overflow-hidden rounded-full">
        <img
          src={icon || "/global.gif"}
          alt={`${name} flag`}
          className="pointer-events-none h-4 w-4 object-cover"
          onError={(e) => {
            e.target.src = "/global.gif";
          }}
        />
      </div>
      <span>{name} Region</span>
    </span>
  );
};

const ProductBanner = ({ name, image, badges = {} }) => {
  const { banner, static: staticBadge, delivery, region } = badges;

  return (
    <section
      className="flex flex-col bg-transparent text-black/90"
      aria-labelledby="product-title"
    >
      {/* ---------- Banner ---------- */}
      {banner && (
        <div className="w-full overflow-hidden rounded-t-lg">
          <img
            src={banner}
            alt={`${name} banner`}
            className="pointer-events-none h-auto w-full object-cover"
            decoding="async"
          />
        </div>
      )}

      {/* ---------- Info Row ---------- */}
      <div className="mt-4 flex items-center gap-5">
        {/* Thumbnail */}
        <img
          src={image}
          alt={`${name} icon`}
          className="pointer-events-none h-20 w-20 rounded-xl object-cover lg:h-23 lg:w-23"
        />

        {/* Text & Badges */}
        <div className="flex flex-col gap-2 text-start">
          <h2
            id="product-title"
            className="text-lg leading-tight font-semibold tracking-wide"
          >
            {name}
          </h2>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge icon={staticBadge?.icon} label={staticBadge?.label} />
            <Badge icon={delivery?.icon} label={delivery?.label} />
            <RegionBadge icon={region?.icon} name={region?.name} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductBanner;
