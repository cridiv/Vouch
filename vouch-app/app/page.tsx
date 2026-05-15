import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CodeSection from "./components/CodeSection";
import Features from "./components/Features";
import About from "./components/About";
import HowItWorks from "./components/HowItWorks";
import CtaCard from "./components/CtaCard";
import Faqs from "./components/Faqs";
import Footer from "./components/Footer";
import AuthRedirect from "./components/AuthRedirect";

export default function Home() {
  return (
    <div>
      <AuthRedirect />
      <Navbar />
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <CodeSection />
      <CtaCard />
      <Faqs />
      <Footer />
    </div>
  );
}
