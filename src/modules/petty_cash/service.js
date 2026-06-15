const pettyCashRepo = require('./repository');
const appEvents = require('../../shared/utils/events');

class PettyCashService {
    async getStatus() {
        const balanceData = await pettyCashRepo.getBalance();
        const transactions = await pettyCashRepo.getTransactions(20);
        return {
            balance: balanceData ? parseFloat(balanceData.balance) : 0,
            history: transactions
        };
    }

    async addTransaction(type, amount, reason) {
        const status = await this.getStatus();
        let newBalance = status.balance;

        if (type === 'spend') {
            newBalance -= parseFloat(amount);
        } else if (type === 'refill') {
            newBalance += parseFloat(amount);
        }

        await pettyCashRepo.updateBalance(newBalance);
        await pettyCashRepo.createTransaction({
            type,
            amount,
            reason
        });

        appEvents.emit('petty_cash_updated');
        return { balance: newBalance };
    }
}

module.exports = new PettyCashService();
