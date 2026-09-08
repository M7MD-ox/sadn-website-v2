import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres.eoapvvgssnzgrkwrlzri:n9dDHkI5xDwAmKaO@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1' } } });
const t = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 15000);
p.setting.findFirst().then((s) => { clearTimeout(t); console.log('OK via 6543 transaction pooler, found setting:', !!s); process.exit(0); }).catch((e) => { clearTimeout(t); console.log('ERR:', e.message.slice(0, 140)); process.exit(1); });
