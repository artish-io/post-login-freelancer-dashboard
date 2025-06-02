// src/app/get-started/signup/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import SignUpModal from "../../../components/sign-up-modal";
export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col justify-between">
      <div className="sticky top-0 z-50 bg-white">
        <Navbar1 />
      </div>
      <div className="flex-grow">
        <SignUpModal />
      </div>
      <Footer />
    </main>
  );
}
