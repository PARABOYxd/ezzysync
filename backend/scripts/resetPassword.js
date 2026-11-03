const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const userService = require('../services/userService');

async function main() {
  const email = 'jainrishab9821@gmail.com';
  const password = 'jainrishab9821';

  try {
    let user = await userService.findUserByEmail(email);
    if (!user) {
      console.log(`[INFO] User ${email} not found in database. Creating new tenant & user...`);
      user = await userService.createUser({
        email,
        password,
        name: 'Rishab Jain',
        companyName: 'EzzySync'
      });
      console.log(`[SUCCESS] User created! User ID: ${user.userId}, Tenant ID: ${user.tenantId}`);
    } else {
      console.log(`[INFO] User ${email} found (User ID: ${user.userId}). Resetting password...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE LOWER(email) = LOWER($2)',
        [passwordHash, email]
      );
      await query(
        'UPDATE tenants SET password_hash = $1 WHERE LOWER(email) = LOWER($2)',
        [passwordHash, email]
      );
      console.log('[SUCCESS] Password updated in users and tenants tables!');
    }

    // Ensure ADMIN role and super admin privileges
    await query(
      "UPDATE users SET role = 'ADMIN', is_super_admin = TRUE WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    // Verify login credentials
    const updatedUser = await userService.findUserByEmail(email);
    const isValid = await userService.verifyPassword(updatedUser, password);

    console.log('\n--- VERIFICATION RESULT ---');
    console.log('Email:', updatedUser.email);
    console.log('Password Match:', isValid ? 'YES (Valid)' : 'NO (Failed)');
    console.log('Role:', updatedUser.role);
    console.log('Is Super Admin:', updatedUser.isSuperAdmin);
    console.log('Company:', updatedUser.companyName);

    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Failed to set password:', err);
    process.exit(1);
  }
}

main();
