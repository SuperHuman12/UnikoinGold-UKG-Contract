module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8645,
      network_id: "*" // Match any network id
    },
    mainproxy: {
      host: "localhost",
      port: 8645,
      network_id: "3", // Kovan network_id
      gas: 4100036
    },
    maindistribution: {
      host: "localhost",
      port: 8645,
      network_id: "15", // Kovan network_id
      gas: 4700036
    }
  }
};
