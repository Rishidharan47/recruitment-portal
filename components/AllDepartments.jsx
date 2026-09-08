"use client";

import React from "react";

// MagicUI imports
import BentoGridComp from "./BentoGridComp";

// This used to track window dimensions on every resize event, recompute a
// 35,000-iteration "mesh density" number on every render, and remount the
// whole grid via a changing `key` whenever the viewport crossed 768px. None of
// it affected the output - the grid is responsive through CSS.
const AllDepartments = () => <BentoGridComp />;

export default AllDepartments;
