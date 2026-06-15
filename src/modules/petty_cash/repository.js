const db = require('../../shared/config/database');

class PettyCashRepository {
    async getBalance() {
        return db.select('tbl_petty_cash', 'balance', 'id = 1');
    }

    async updateBalance(newBalance) {
        return db.update('tbl_petty_cash', { balance: newBalance }, 'id = 1');
    }

    async createTransaction(data) {
        return db.insert('tbl_petty_cash_transactions', data);
    }

    async getTransactions(limit = 10) {
        return db.selectAll('tbl_petty_cash_transactions', '*', '', [], 'ORDER BY created_at DESC LIMIT ' + limit);
    }
}

module.exports = new PettyCashRepository();
