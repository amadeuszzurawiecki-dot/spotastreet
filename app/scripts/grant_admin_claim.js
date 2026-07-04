#!/usr/bin/env node

async function main() {
  const emailArg = process.argv.find(arg => arg.startsWith('--email='));
  const uidArg = process.argv.find(arg => arg.startsWith('--uid='));
  const email = emailArg?.split('=').slice(1).join('=').trim();
  const uid = uidArg?.split('=').slice(1).join('=').trim();

  if (!email && !uid) {
    console.error('Usage: npm run admin:grant -- --email=you@example.com');
    console.error('   or: npm run admin:grant -- --uid=firebase-user-uid');
    process.exit(1);
  }

  let adminApp;
  let adminAuth;
  try {
    adminApp = await import('firebase-admin/app');
    adminAuth = await import('firebase-admin/auth');
  } catch {
    console.error('Missing dependency: firebase-admin');
    console.error('Install it first: npm install firebase-admin --save-dev');
    process.exit(1);
  }

  const { initializeApp, applicationDefault, cert, getApps } = adminApp;
  const { getAuth } = adminAuth;

  if (!getApps().length) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'zgadulica';

    if (serviceAccountPath) {
      const fs = await import('node:fs');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }
  }

  const auth = getAuth();
  const targetUser = uid
    ? await auth.getUser(uid)
    : await auth.getUserByEmail(email);

  await auth.setCustomUserClaims(targetUser.uid, {
    ...(targetUser.customClaims || {}),
    admin: true,
  });

  console.log(`Admin claim granted: ${targetUser.email || targetUser.uid}`);
  console.log('Now sign out/sign in again or click "Odśwież uprawnienia" in /admin.');
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
