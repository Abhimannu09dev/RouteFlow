const { getUsersByRole } = require("./connectionManager");

function notifyLogisticsNewOrder(order) {
  const logisticsUsers = getUsersByRole("logistics");

  logisticsUsers.forEach(({ socket }) => {
    if (socket.readyState === 1) {
      socket.send(
        JSON.stringify({
          type: "NEW_ORDER",
          payload: order,
        }),
      );
    }
  });
}

module.exports = { notifyLogisticsNewOrder };
