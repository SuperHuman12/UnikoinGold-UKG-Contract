module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    mainproxy: {
      host: "localhost",
      port: 8545,
      network_id: "42", // Kovan network_id
      gas: 6500000
    },
    maindistribution: {
      host: "localhost",
      port: 8545,
      network_id: "42", // Kovan network_id
      gas: 6500000
    }
  }
};
