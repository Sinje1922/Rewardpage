import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const destinationPrisma = new PrismaClient();

async function migrate() {
  const sourceUrl = process.env.OLD_DATABASE_URL;
  if (!sourceUrl) {
    console.error("OLD_DATABASE_URL is not defined in .env");
    process.exit(1);
  }

  const client = new Client({ connectionString: sourceUrl });
  
  try {
    await client.connect();
    console.log("Connected to source PostgreSQL.");

    // Helper to fetch all rows from a table
    const fetchAll = async (table: string) => {
      const res = await client.query(`SELECT * FROM "${table}"`);
      return res.rows;
    };

    // 1. Users
    console.log("Migrating Users...");
    const users = await fetchAll('User');
    for (const u of users) {
      await destinationPrisma.user.upsert({
        where: { id: u.id },
        update: u,
        create: u
      });
    }

    // 2. Campaigns
    console.log("Migrating Campaigns...");
    const campaigns = await fetchAll('Campaign');
    for (const c of campaigns) {
      await destinationPrisma.campaign.upsert({
        where: { id: c.id },
        update: c,
        create: c
      });
    }

    // 3. Missions
    console.log("Migrating Missions...");
    const missions = await fetchAll('Mission');
    for (const m of missions) {
      await destinationPrisma.mission.upsert({
        where: { id: m.id },
        update: m,
        create: m
      });
    }

    // 4. Submissions
    console.log("Migrating Submissions...");
    const submissions = await fetchAll('Submission');
    for (const s of submissions) {
      await destinationPrisma.submission.upsert({
        where: { id: s.id },
        update: s,
        create: s
      });
    }

    // 5. Winners
    console.log("Migrating Winners...");
    const winners = await fetchAll('Winner');
    for (const w of winners) {
      await destinationPrisma.winner.upsert({
        where: { id: w.id },
        update: w,
        create: w
      });
    }

    // 6. AnalyticsEvents
    console.log("Migrating AnalyticsEvents...");
    const events = await fetchAll('AnalyticsEvent');
    for (const e of events) {
      await destinationPrisma.analyticsEvent.upsert({
        where: { id: e.id },
        update: e,
        create: e
      });
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
    await destinationPrisma.$disconnect();
  }
}

migrate();
