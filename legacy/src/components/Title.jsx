const Title = ({
  name,
  desc,
  className = "",
  align = "start",
  color = "text-white",
  size = "text-2xl",
  gif,
}) => {
  return (
    <div className={`w-full text-${align}`}>
      <div className={`mb-8 flex flex-col gap-3 text-${align}`}>
        <div className="flex gap-2">
          <h1 className={`font-bold ${size} ${color} ${className} `}>{name}</h1>
          <img src={gif} className="w-8 h-8 -mt-1" alt="" />
        </div>
        {desc && <p className={`font-normal text-black`}>{desc}</p>}
      </div>
    </div>
  );
};

export default Title;
