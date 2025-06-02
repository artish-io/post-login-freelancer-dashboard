// src/app/login/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import LoginModal from "../../../components/login-modal";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="flex-grow">
        <LoginModal />
      </div>

      <Footer />
    </main>
  );
}
