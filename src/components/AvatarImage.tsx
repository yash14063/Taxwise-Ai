import React, { useState } from "react";

interface AvatarImageProps {
  src: string;
  alt: string;
  fullName: string;
  sizeClass?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  fullName,
  sizeClass = "w-9 h-9",
}) => {
  const [failed, setFailed] = useState(false);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center shrink-0 select-none border border-slate-300`}
        aria-label={alt}
      >
        {initials || "IN"}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-lg object-cover shrink-0 border border-slate-200`}
    />
  );
};
