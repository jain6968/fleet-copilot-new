// server/seed.js
import { driver } from "./neo4j.js";

const queries = [
  `MERGE (v:Vehicle {vin:'1FBUU6YAA5HA71058'})
     SET v.make='Ford', v.model='F-Series', v.year=2016, v.miles=74212, v.licensePlate='F123 ABC'`,

  `MERGE (d:DTC {code:'P20EE'})
     ON CREATE SET d.description='NOx catalyst efficiency below threshold'`,

  `MATCH (v:Vehicle {vin:'1FBUU6YAA5HA71058'}), (d:DTC {code:'P20EE'})
     MERGE (v)-[:HAS_DTC]->(d)`,

  `MERGE (r1:Repair {id:'Repair-432'})
     SET r1.name='NOx sensor replacement', r1.date='2023-03-19'`,

  `MATCH (v:Vehicle {vin:'1FBUU6YAA5HA71058'}), (r1:Repair {id:'Repair-432'})
     MERGE (v)-[:HAS_REPAIR]->(r1)`,

  `MERGE (e1:Evidence {id:'TSB-97'})
     SET e1.type='TSB', e1.title='TSB-97',
         e1.summary='NOx sensor may report P20EE when sensor aging...'`,

  `MERGE (e2:Evidence {id:'Repair-432'})
     SET e2.type='Repair', e2.title='Repair-432',
         e2.summary='Replaced NOx sensor, fault cleared'`,

  `MATCH (d:DTC {code:'P20EE'}),
         (e1:Evidence {id:'TSB-97'}),
         (e2:Evidence {id:'Repair-432'})
     MERGE (d)-[:HAS_EVIDENCE]->(e1)
     MERGE (d)-[:HAS_EVIDENCE]->(e2)`
];

const go = async () => {
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      for (const q of queries) {
        console.log("Running:", q.split("\n")[0]); // log first line of query
        await tx.run(q);
      }
    });
    console.log("✅ Seeded Aura with sample data.");
  } catch (err) {
    console.error("❌ Error seeding:", err);
  } finally {
    await session.close();
    process.exit(0);
  }
};

go();
