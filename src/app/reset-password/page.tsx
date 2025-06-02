// src/app/reset-password/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import ResetPasswordModal from "../../../components/reset-password-modal";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="flex-grow">
        <ResetPasswordModal />
      </div>

      <Footer />
    </main>
  );
}
