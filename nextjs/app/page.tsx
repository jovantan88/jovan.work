import { Instrument_Serif } from "next/font/google";
import AsciiSite from "./components/ascii/AsciiSite";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export default function Home() {
  return <AsciiSite className={display.variable} />;
}
