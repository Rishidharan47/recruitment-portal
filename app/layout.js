// Font
import { Inter } from "next/font/google";
// Providers
import { Toaster } from "@/components/ui/sonner";
import { SubmissionsProvider } from "@/components/SubmissionsProvider";
// Styling
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Organization Name | Recruitment Portal",
  description: "Recruitment portal for Organization Name",
};

// `dark` is what activates the design tokens in globals.css (tailwind is
// configured with darkMode: "class"). The Inter font was imported here but
// never applied to anything.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* Every page starts with the same header and nav; without this, a
            keyboard or screen reader user tabs through it on each page before
            reaching the content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-black"
        >
          Skip to main content
        </a>
        <SubmissionsProvider>
          {children}
          <Toaster />
        </SubmissionsProvider>
      </body>
    </html>
  );
}
