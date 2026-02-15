import { Hero } from "@/components/sections/Hero";
import { Product } from "@/components/sections/Product";
import { Benefits } from "@/components/sections/Benefits";
import { LaunchStatus } from "@/components/sections/LaunchStatus";
import { PageViewTracker } from "@/components/PageViewTracker";

export default function Home() {
  return (
    <main className="min-h-screen">
      <PageViewTracker />
      <Hero />
      <Product />
      <Benefits />
      <LaunchStatus />
    </main>
  );
}
