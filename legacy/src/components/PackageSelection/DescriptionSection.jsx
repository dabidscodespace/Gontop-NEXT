// components/PackageSelection/DescriptionSection.jsx
const DescriptionSection = ({ description, className = "" }) => {
  return (
    <div
      className={`bg-bg-tertiary rounded-xl p-5 border border-border ${className}`}
    >
      <h2 className="text-black uppercase mb-3 text-xs font-semibold">
        Description
      </h2>
      <div
        dangerouslySetInnerHTML={{ __html: description || "" }}
        className="text-black text-sm leading-relaxed space-y-2"
      />
    </div>
  );
};

export default DescriptionSection;
