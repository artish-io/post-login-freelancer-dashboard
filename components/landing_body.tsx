import Image from "next/image";

export default function GetStarted() {
  return (
    <div className="bg-white px-6 pt-12 pb-20 font-jakarta text-black">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-medium">
          Welcome to the new frontier of getting things done
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 leading-tight">
          Which option best describes <br /> your goals?
        </h1>
        <p className="mt-4 text-base">I would like to….</p>
      </div>

      <div className="mt-12 flex flex-col md:flex-row justify-center items-start gap-6 max-w-5xl mx-auto">
        {/* Option 1 */}
        <div className="w-full md:w-1/2 border rounded-2xl p-6 flex flex-col items-start text-left gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-8 h-8">
            <Image
              src="/Relume.png"
              alt="Relume icon"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold">Hire freelancers</h2>
          <p className="text-sm text-gray-600">
            You’re a recruitment guru, business owner, or project manager with a keen eye for talent
          </p>
          <button className="mt-4 w-max px-4 py-2 bg-black text-white text-sm rounded-md">
            Get Started
          </button>
        </div>

        {/* Option 2 */}
        <div className="w-full md:w-1/2 border rounded-2xl p-6 flex flex-col items-start gap-4 shadow-sm hover:shadow-md transition">
          <div className="w-8 h-8">
            <Image
              src="/Relume.png"
              alt="Relume icon"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-left">Get paid for my skills</h2>
          <p className="text-sm text-gray-600 text-left">
            You’re a digitally-skilled creative maverick, looking to make money doing what you love to do best
          </p>
          <button className="mt-4 px-4 py-2 bg-black text-white text-sm rounded-md">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
