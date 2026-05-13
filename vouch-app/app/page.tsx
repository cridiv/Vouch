import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CodeSection from "./components/CodeSection";
import Features from "./components/Features";

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <Features />
      <CodeSection />
    </div>
  );
}
