import Image from "next/image";

/**
 * Wraps a product screenshot in a browser window or phone bezel frame.
 * If src is not provided, renders a grey placeholder box.
 *
 * Drop real screenshots into landing/public/images/screens/:
 *   pipeline.webp · whatsapp.webp · itinerary.webp · quote.webp · ledger.webp
 *
 * Props:
 *   src?     — path in /public, e.g. "/images/screens/pipeline.webp"
 *   alt      — descriptive alt text (required)
 *   variant  — "browser" | "phone"  (default: "browser")
 *   width    — intrinsic image width  (default 1280)
 *   height   — intrinsic image height (default 800)
 */
export default function ScreenshotFrame({
  src,
  alt,
  variant = "browser",
  width = 1280,
  height = 800,
}) {
  if (variant === "phone") {
    return (
      <div className="relative mx-auto w-[220px] sm:w-[260px]">
        {/* Phone bezel */}
        <div className="relative bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-800">
          <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />
          <div className="rounded-[1.5rem] overflow-hidden bg-slate-100">
            {src ? (
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[9/16] bg-slate-200 flex items-center justify-center">
                <span className="text-xs text-slate-400 text-center px-4">
                  Screenshot coming soon
                </span>
              </div>
            )}
          </div>
          <div className="w-8 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
        </div>
      </div>
    );
  }

  // Browser variant
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.10)] bg-slate-950">
      {/* Window bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-900 border-b border-slate-800">
        <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
        <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
        <span className="ml-3 flex-1 h-5 bg-slate-800 rounded-md" />
      </div>
      <div className="bg-slate-100">
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto"
          />
        ) : (
          <div className="aspect-video bg-slate-100 flex items-center justify-center">
            <span className="text-sm text-slate-400">Screenshot coming soon</span>
          </div>
        )}
      </div>
    </div>
  );
}
