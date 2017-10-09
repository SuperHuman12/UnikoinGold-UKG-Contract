module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    kovanproxy: {
      host: "localhost",
      port: 8545,
      network_id: "42", // Kovan network_id
      gas: 6993150
    },
    kovandistribution: {
      host: "localhost",
      port: 8545,
      network_id: "42", // Kovan network_id
      gas: 6900000
    }
  }
};
