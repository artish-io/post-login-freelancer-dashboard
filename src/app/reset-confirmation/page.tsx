// src/app/reset-confirmation/page.tsx

import Navbar1 from "../../../components/navbar1";
import Footer from "../../../components/footer";
import PasswordResetConfirmation from "../../../components/password-reset-confirmation";

export default function ResetConfirmationPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white shadow">
        <Navbar1 />
      </header>

      <div className="flex-grow">
        <PasswordResetConfirmation />
      </div>

      <Footer />
    </main>
  );
}
