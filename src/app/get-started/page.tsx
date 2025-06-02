// src/app/get-started/page.tsx

import Navbar1 from "../../../components/navbar1";
import LandingBody from "../../../components/landing_body";
import Footer from "../../../components/footer";

export default function GetStarted() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      {/* Main Content */}
      <div className="flex-grow">
        <LandingBody />
      </div>

      {/* Footer */}
      <Footer />
    </main>
  );
}
