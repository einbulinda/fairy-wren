import MenuPage from "./pages/MenuPage";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Events from "./components/Events";
import Gallery from "./components/Gallery";
import Testimonials from "./components/Testimonials";
import InfoStrip from "./components/InfoStrip";
import Contact from "./components/Contact";
import Reservation from "./components/Reservation";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";

export default function App() {
  if (window.location.pathname === "/menu") return <MenuPage />;

  return (
    <div className="min-h-screen bg-night-900 font-sans">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Events />
        <Gallery />
        <Testimonials />
        <InfoStrip />
        <Reservation />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
