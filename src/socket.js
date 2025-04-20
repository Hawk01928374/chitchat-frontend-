import { io } from 'socket.io-client';

// Connect to the backend (adjust the URL if needed)
const socket = io('http://localhost:5000');  // or use your backend URL if deployed

// Function to emit events (you'll use this to send data like offers, answers, and candidates)
const sendMessage = (event, data) => {
  socket.emit(event, data);
};

// Listen for events (like offers, answers, and candidates from the server)
const onMessage = (event, callback) => {
  socket.on(event, callback);
};

export { sendMessage, onMessage };

