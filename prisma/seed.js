const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialProcesses = [
  {
    title: "Dairy Pasteurization",
    description:
      "High-temperature short-time (HTST) pasteurization protocol for milk and dairy products. Ensures pathogen elimination while preserving nutritional value.",
    category: "Thermal Processing",
    temperature: "72°C",
    duration: "15 seconds",
    compliance: ["HACCP", "FDA", "ISO 22000"],
    status: "active",
  },
  {
    title: "Grain Milling & Refining",
    description:
      "Multi-stage grain processing including cleaning, tempering, milling, and sifting. Produces consistent flour grades for bakery applications.",
    category: "Mechanical Processing",
    temperature: "Ambient",
    duration: "4 hours",
    compliance: ["FDA", "ISO 22000"],
    status: "active",
  },
  {
    title: "Meat Curing & Packaging",
    description:
      "Controlled curing process with nitrate management, vacuum packaging, and modified atmosphere storage for extended shelf life.",
    category: "Preservation",
    temperature: "4°C",
    duration: "48 hours",
    compliance: ["HACCP", "FDA"],
    status: "active",
  },
  {
    title: "Fruit Juice Extraction",
    description:
      "Cold-press extraction and flash pasteurization for premium fruit juices. Retains maximum vitamins and natural flavor profiles.",
    category: "Extraction",
    temperature: "5°C",
    duration: "30 minutes",
    compliance: ["FDA", "ISO 22000"],
    status: "active",
  },
  {
    title: "Snack Extrusion",
    description:
      "Twin-screw extrusion technology for creating puffed snacks, cereal shapes, and textured protein products at high throughput.",
    category: "Mechanical Processing",
    temperature: "180°C",
    duration: "45 minutes",
    compliance: ["FDA", "HACCP"],
    status: "active",
  },
  {
    title: "Beverage Fermentation",
    description:
      "Controlled fermentation monitoring with automated pH, temperature, and sugar level tracking for consistent batch quality.",
    category: "Biological Processing",
    temperature: "25°C",
    duration: "7 days",
    compliance: ["ISO 22000", "HACCP"],
    status: "active",
  },
];

async function main() {
  console.log("Seeding database...");
  for (const p of initialProcesses) {
    const existing = await prisma.process.findFirst({
      where: { title: p.title }
    });
    if (!existing) {
      await prisma.process.create({
        data: {
          ...p,
          compliance: JSON.stringify(p.compliance)
        },
      });
      console.log(`Created process: ${p.title}`);
    } else {
      console.log(`Process already exists: ${p.title}`);
    }
  }
  console.log("Database seed check completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
