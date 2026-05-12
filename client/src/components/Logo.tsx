import React from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "", alt = "Deezcord" }) => {
  return (
    <img
      src="/Logo.png"
      alt={alt}
      className={`object-contain rounded-xl ${className}`}
    />
  );
};

export default Logo;
