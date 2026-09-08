"use client";

import React from "react";

// react-table passes `indeterminate`; this component destructured
// `intermediate` (a typo), so the flag was spread onto the DOM input - React
// warned about a non-boolean attribute and the "select all" checkbox never
// showed its partially-selected state. `indeterminate` is a DOM property, not
// an attribute, so it has to be assigned on the element.
export const CheckBoxComp = React.forwardRef(
  ({ indeterminate = false, label = "Select row", ...rest }, ref) => {
    const defaultRef = React.useRef(null);
    const resolvedRef = ref || defaultRef;

    React.useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [resolvedRef, indeterminate]);

    // These checkboxes render with no visible text, so without an explicit
    // label a screen reader announces them only as "checkbox".
    return (
      <input
        type="checkbox"
        ref={resolvedRef}
        aria-label={label}
        className="h-4 w-4 accent-[hsl(var(--brand))]"
        {...rest}
      />
    );
  }
);

CheckBoxComp.displayName = "CheckBoxComp";
