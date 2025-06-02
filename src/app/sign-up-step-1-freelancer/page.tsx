// src/app/sign-up-step-1-freelancer/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import FreelancerSignUpFlow from "../../../components/freelancer-sign-up-flow";

export default function FreelancerSignUpStep1Page() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="flex-grow">
        <FreelancerSignUpFlow />
      </div>

      <Footer />
    </main>
  );
}