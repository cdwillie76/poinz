import {v4 as uuid} from 'uuid';
import Immutable from 'immutable';
import Promise from 'bluebird';
import testUtils from './testUtils';
import processorFactory from '../../src/commandProcessor';

test('process a dummy command successfully', () => {
  const processor = processorFactory(
    {
      setUsername: {
        canCreateRoom: true,
        fn: (room, command) => room.applyEvent('usernameSet', command.payload)
      }
    },
    {
      usernameSet: () => new Immutable.Map()
    },
    testUtils.newMockRoomsStore()
  );

  return processor(
    {
      id: uuid(),
      name: 'setUsername',
      payload: {userId: 'abc', username: 'john'}
    },
    'abc'
  ).then((producedEvents) => {
    expect(producedEvents).toBeDefined();
    expect(producedEvents.length).toBe(1);
    expect(producedEvents[0].name).toEqual('usernameSet');
  });
});

test('process a dummy command with No Handler', () => {
  const processor = processorFactory(
    {
      // no command handlers
    },
    {
      // no event handlers
    },
    testUtils.newMockRoomsStore()
  );

  return expect(
    processor(
      {
        id: uuid(),
        roomId: 'my-test-room',
        name: 'setUsername',
        payload: {userId: 'abc', username: 'john'}
      },
      'abc'
    )
  ).rejects.toThrow('No command handler found for setUsername');
});

test('process a dummy command where command handler produced unknown event', () => {
  const processor = processorFactory(
    {
      setUsername: {
        canCreateRoom: true,
        fn: (room) => room.applyEvent('unknownEvent', {})
      }
    },
    {
      // no event handlers
    },
    testUtils.newMockRoomsStore()
  );

  return expect(
    processor(
      {
        id: uuid(),
        name: 'setUsername',
        payload: {userId: 'abc', username: 'john'}
      },
      'abc'
    )
  ).rejects.toThrow('Cannot apply unknown event unknownEvent');
});

test('process a dummy command where command precondition throws', () => {
  const processor = processorFactory(
    {
      setUsername: {
        canCreateRoom: true,
        preCondition: () => {
          throw new Error('Uh-uh. nono!');
        }
      }
    },
    {
      // no event handlers
    },
    testUtils.newMockRoomsStore()
  );

  return expect(
    processor(
      {
        id: uuid(),
        name: 'setUsername',
        payload: {userId: 'abc', username: 'john'}
      },
      'abc'
    )
  ).rejects.toThrow('Precondition Error during "setUsername": Uh-uh. nono!');
});

test('process a dummy command where command validation fails', () => {
  const processor = processorFactory({}, {}, testUtils.newMockRoomsStore());

  return expect(
    processor(
      {
        id: uuid(),
        roomId: 'my-test-room',
        // no name -> cannot load appropriate schema
        payload: {}
      },
      'abc'
    )
  ).rejects.toThrow('Command validation Error during "undefined": Command must contain a name');
});

test('process a dummy command where command validation fails (schema)', () => {
  const processor = processorFactory({}, {}, testUtils.newMockRoomsStore());

  return expect(
    processor(
      {
        id: uuid(),
        roomId: 'my-test-room',
        name: 'setUsername',
        payload: {}
      },
      'abc'
    )
  ).rejects.toThrow('Missing required property');
});

test('process a dummy command without roomId: where room must exist', () => {
  const processor = processorFactory(
    {
      setUsername: {
        fn: () => {}
      }
    },
    {},
    testUtils.newMockRoomsStore()
  );

  return expect(
    processor(
      {
        id: uuid(),
        name: 'setUsername',
        payload: {userId: 'abc', username: 'john'}
      },
      'abc'
    )
  ).rejects.toThrow(
    // no roomId given in command. handler does not allow creation of new room
    'Command "setUsername" only wants to get handled for an existing room'
  );
});

test('process a dummy command with roomId: where room must exist', () => {
  const processor = processorFactory(
    {
      setUsername: {
        fn: () => {}
      }
    },
    {},
    testUtils.newMockRoomsStore()
  );

  return expect(
    processor(
      {
        id: uuid(),
        roomId: 'rm_' + uuid(),
        name: 'setUsername',
        payload: {userId: 'abc', username: 'john'}
      },
      'abc'
    )
  ).rejects.toThrow(
    //  roomId is given in command, room does not exist
    'does not exist. ("setUsername")'
  );
});

/**
 * Assures that we handle two "simultaneously" incoming commands correctly.
 */
test('concurrency handling', () => {
  const mockRoomsStore = testUtils.newMockRoomsStore({
    id: 'concurrencyTestRoom',
    manipulationCount: 0
  });

  const processor = processorFactory(
    {
      setUsername: {
        fn: (room, command) => room.applyEvent('usernameSet', command.payload)
      }
    },
    {
      usernameSet: (room, eventPayload) =>
        room
          .set('username', eventPayload.username)
          .set('manipulationCount', room.get('manipulationCount') + 1)
    },
    mockRoomsStore
  );

  const eventPromiseOne = processor(
    {
      id: uuid(),
      roomId: 'concurrencyTestRoom',
      name: 'setUsername',
      payload: {userId: '1', username: 'tom'}
    },
    '1'
  );
  const eventPromiseTwo = processor(
    {
      id: uuid(),
      roomId: 'concurrencyTestRoom',
      name: 'setUsername',
      payload: {userId: '1', username: 'jerry'}
    },
    '1'
  );

  return Promise.all([eventPromiseOne, eventPromiseTwo])
    .then(() => mockRoomsStore.getRoomById('concurrencyTestRoom'))
    .then((room) => expect(room.get('manipulationCount')).toBe(2));
});
