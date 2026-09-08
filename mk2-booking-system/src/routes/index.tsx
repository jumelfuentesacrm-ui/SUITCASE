import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { WhySection } from "@/components/site/WhySection";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { Gallery } from "@/components/site/Gallery";
import { Booking } from "@/components/site/Booking";
import { Policies } from "@/components/site/Policies";
import { Reviews } from "@/components/site/Reviews";
import { BookCta } from "@/components/site/BookCta";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [preselected] = useState<{ categoryId: string; serviceName: string } | null>(null);

  return (
    <div style={{ background: "#feeff2", color: "#2a1a20" }}>
      <Navbar />
      <main>
        <Hero />
        <WhySection />
        <About />
        <Services />
        <Gallery />
        <Booking preselected={preselected} onConsumePreselected={() => {}} />
        <Policies />
        <Reviews />
        <BookCta />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
