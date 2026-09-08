"use client";
// React import
import React, { useState } from "react";

// Component imports
import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import DepartmentsPreview from "@/components/DepartmentsPreview";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import { authClient } from "@/lib/auth-client";

const POPUP_DATA = {
  header: "Recruitment Notice",
  description: "Welcome to the recruitment portal.",
  message: [
    "Sign in with your email address to begin your application.",
    "You can apply to up to two departments.",
  ],
};

// Removed from this page: a 300,000-iteration maths loop that ran on every
// render, plus uncleaned mousemove and scroll listeners that called setState on
// every event. Together they re-rendered (and re-ran the loop on) the landing
// page continuously while the pointer moved, and leaked both listeners on
// unmount. None of their output was ever displayed.
const Home = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;

  // NavBar renders the banner landmark and Footer the contentinfo one, so
  // neither belongs inside <main>.
  return (
    <>
      <NavBar />
      {!isPending && !user && (
        <PopupComp
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          PopupData={POPUP_DATA}
        />
      )}
      <main id="main-content">
        <Hero />
        <DepartmentsPreview />
      </main>
      <Footer />
    </>
  );
};

export default Home;
