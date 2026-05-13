import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CodeSection from "./components/CodeSection";
import Features from "./components/Features";
import About from "./components/About";

export default function Home() {
  return (
    <div>
      <Navbar />
      <Hero />
      <About />
      <Features />

      <CodeSection />
    </div>
  );
}
