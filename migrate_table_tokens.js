const db = require('./src/shared/config/database');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { frontendUrl } = require('./src/shared/config/dotenvConfig');
const { addColumnIfNotExists, isDuplicateColumnError } = require('./src/shared/utils/migrationHelpers');

async function migrate() {
    try {
        console.log('🚀 Running migration: Adding qr_token to tbl_tables...');
        
        try {
            await addColumnIfNotExists(
                db,
                'tbl_tables',
                'qr_token',
                'qr_token VARCHAR(64) UNIQUE AFTER qr_code_url'
            );
        } catch (err) {
            if (!isDuplicateColumnError(err)) throw err;
            console.log('ℹ️ Column qr_token already exists. Continuing...');
        }

        // 2. Fetch all tables to update them with tokens
        const tables = await db.queryAll('SELECT id, table_number FROM tbl_tables');
        console.log(`ℹ️ Found ${tables.length} tables to update.`);

        for (const table of tables) {
            // Generate a random secure 32-character token
            const qrToken = crypto.randomBytes(16).toString('hex');
            
            // Generate QR Code URL with the secure token
            const tableUrl = `${frontendUrl}/menu?table_token=${qrToken}`;
            const qrCodeDataUrl = await QRCode.toDataURL(tableUrl);

            // Update in database
            await db.update('tbl_tables', {
                qr_token: qrToken,
                qr_code_url: qrCodeDataUrl
            }, 'id = ?', [table.id]);

            console.log(`✅ Table ${table.table_number || table.id} updated with token.`);
        }

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
