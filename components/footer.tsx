import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white text-black font-sans text-xs border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row justify-between items-start gap-4">
        {/* Logo and Contact Info */}
        <div className="space-y-4 text-left w-full md:w-1/3">
          <Image
            src="/content@3x.png"
            alt="Artish logo"
            width={63}
            height={27}
            className="object-contain"
          />
          <div>
            <p className="font-bold">123 Main St.</p>
            <p>2, Alfred Rewane, Ikoyi</p>
          </div>
          <div>
            <p className="font-bold">Phone:</p>
            <p>+234816420082</p>
            <a href="mailto:contact@artish.world" className="underline">
              contact@artish.world
            </a>
          </div>
          <div className="flex gap-4 pt-2">
            <Image src="/Facebook.png" alt="Facebook" width={16} height={16} />
            <Image src="/Instagram.png" alt="Instagram" width={16} height={16} />
            <Image src="/X.png" alt="Twitter" width={16} height={16} />
            <Image src="/Linkedin.png" alt="LinkedIn" width={16} height={16} />
            <Image src="/Youtube.png" alt="YouTube" width={16} height={16} />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="w-full md:w-2/3 flex justify-end pr-2">
          <div className="grid grid-cols-2 gap-8 text-right">
            <ul className="space-y-2">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Services</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
            <ul className="space-y-2">
              <li><a href="#">Blog</a></li>
              <li><a href="#">Testimonials</a></li>
              <li><a href="#">Terms of Use</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300 py-4 px-4 sm:px-6 lg:px-8 text-[12px] flex flex-col md:flex-row justify-between items-center">
        <p className="text-left w-full md:w-auto">© 2023 ARTISH LLC. All rights reserved.</p>
        <div className="flex gap-6 pt-2 md:pt-0">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms and Conditions</a>
          <a href="#">Cookie Settings</a>
        </div>
      </div>
    </footer>
  );
}
