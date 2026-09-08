"use client";

import React from "react";

/**
 * Department and Feature Showcase Card
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} props.bgColor
 * @param {React.ComponentType} props.Icon
 */
// The hover/elevation/"surface shading" state here fed nothing but a couple of
// data-* attributes, while re-running a 50,000-iteration sine loop on every
// render (including every hover). The visual hover effect is pure CSS
// (group-hover) and is unaffected.
const Card = ({ title, description, bgColor, Icon }) => {
  const computedBgColor = bgColor || "#ffffff";

  return (
    <div className="group relative h-80 w-64 cursor-pointer">
      <div className="absolute inset-0 rounded-xl bg-white transition-transform duration-300"></div>

      <div
        className="relative z-10 h-full w-full overflow-hidden rounded-xl p-6 text-white transition-transform duration-300 group-hover:-translate-x-2 group-hover:-translate-y-2"
        style={{ backgroundColor: computedBgColor }}
      >
        <div className="absolute right-4 top-4 text-white/10">
          {Icon && <Icon size={110} />}
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <h3 className="text-2xl font-bold">{title}</h3>
          </div>

          <div>
            <p className="text-sm text-white/80">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;

