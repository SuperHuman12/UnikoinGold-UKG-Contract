module.exports = time => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [time],
            id: new Date().getTime() // Id of the request; anything works, really
        }, function(err) {
            if (err) return reject(err);
            resolve();
        });
    });
};