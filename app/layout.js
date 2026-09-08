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
        <SubmissionsProvider>
          {children}
          <Toaster />
        </SubmissionsProvider>
      </body>
    </html>
  );
}
