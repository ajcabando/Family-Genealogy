import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureSettings() {
  const defaults = {
    familyName: '',
    photoApprovalRequired: 'true',
    contributionApprovalRequired: 'true',
    allowRegistration: 'true',
    showLivingBirthYearOnly: 'true',
    allowPhotoDownload: 'true',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}

async function main() {
  await ensureSettings();

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('ℹ  Users already exist — skipping admin creation.');
    return;
  }

  const adminEmail = process.env.FAMILY_ADMIN_EMAIL || 'admin@family.local';
  const adminPassword = process.env.FAMILY_ADMIN_PASSWORD || 'FamilyAdmin123!';

  await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash: bcrypt.hashSync(adminPassword, 10),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`✓ Created administrator account: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
