"use client";

import Script from "next/script";

export default function Background() {
  return (
    <div className="aura-background-component fixed top-0 left-0 w-full h-full -z-50 pointer-events-none">
      <div
        // data-us-project="4OF29NF3HVBYQsrwPvVq"
        data-us-project="FixNvEwvWwbu3QX9qC3F"
        className="absolute w-full h-full left-0 top-0"
      ></div>
      <Script
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
        onLoad={() => {
          // @ts-ignore
          const UnicornStudio = window.UnicornStudio;
          if (UnicornStudio && !UnicornStudio.isInitialized) {
            UnicornStudio.init();
            UnicornStudio.isInitialized = true;
          }
        }}
      />
    </div>
  );
}
