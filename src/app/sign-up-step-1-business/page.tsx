// src/app/sign-up-step-1-business/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import BusinessSignUpFlow from "../../../components/business-sign-up-flow";

export default function BusinessSignUpStep1Page() {
  return (
    <main className="min-h-screen flex flex-col bg-[#EB1966]">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="flex-grow">
        <BusinessSignUpFlow />
      </div>

      <Footer />
    </main>
  );
}