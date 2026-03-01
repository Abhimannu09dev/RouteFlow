const users = new Map();

function addUser(userId, ws, role) {
  users.set(userId, { ws, role });
}

function removeUser(userId) {
  users.delete(userId);
}

function getUserSocket(userId) {
  return users.get(userId);
}

function getUsersByRole(role) {
  const result = [];
  users.forEach((value, key) => {
    if (value.role === role) {
      result.push(key);
    }
  });
  return result;
}

module.exports = { addUser, removeUser, getUserSocket, getUsersByRole };
