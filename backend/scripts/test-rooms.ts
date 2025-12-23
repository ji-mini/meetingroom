import { getRooms } from '../src/services/room.service.js';

async function test() {
  try {
    console.log('Testing getRooms...');
    const rooms = await getRooms();
    console.log('Success:', rooms);
  } catch (error) {
    console.error('Failed:', error);
  }
}

test();
