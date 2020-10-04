import {v4 as uuid} from 'uuid';
import {prepTwoUsersInOneRoomWithOneStoryAndEstimate} from '../testUtils';

test('Should produce storyEstimateCleared event', async () => {
  const {
    roomId,
    storyId,
    userIdOne: userId,
    processor
  } = await prepTwoUsersInOneRoomWithOneStoryAndEstimate();

  const commandId = uuid();
  return processor(
    {
      id: commandId,
      roomId: roomId,
      name: 'clearStoryEstimate',
      payload: {
        storyId: storyId
      }
    },
    userId
  ).then(({producedEvents, room}) => {
    expect(producedEvents).toMatchEvents(commandId, roomId, 'storyEstimateCleared');

    const [storyEstimateClearedEvent] = producedEvents;

    expect(storyEstimateClearedEvent.payload.storyId).toEqual(storyId);

    // should clear value
    expect(room.stories[storyId].estimations[userId]).toBeUndefined();
  });
});

describe('preconditions', () => {
  test('Should throw if storyId does not match a story in the room', async () => {
    const {
      roomId,
      userIdOne: userId,
      processor
    } = await prepTwoUsersInOneRoomWithOneStoryAndEstimate();

    return expect(
      processor(
        {
          id: uuid(),
          roomId: roomId,
          name: 'clearStoryEstimate',
          payload: {
            storyId: 'unknown'
          }
        },
        userId
      )
    ).rejects.toThrow('Can only clear estimation for currently selected story!');
  });

  test('Should throw if story already revealed', async () => {
    const {
      roomId,
      userIdOne: userId,
      storyId,
      processor,
      mockRoomsStore
    } = await prepTwoUsersInOneRoomWithOneStoryAndEstimate();

    mockRoomsStore.manipulate((room) => {
      room.stories[storyId].revealed = true;
      return room;
    });

    return expect(
      processor(
        {
          id: uuid(),
          roomId: roomId,
          name: 'clearStoryEstimate',
          payload: {
            storyId: storyId
          }
        },
        userId
      )
    ).rejects.toThrow('You cannot clear your estimate for a story that was revealed!');
  });

  test('Should throw if user is marked as excluded', async () => {
    const {
      roomId,
      userIdOne: userId,
      storyId,
      processor,
      mockRoomsStore
    } = await prepTwoUsersInOneRoomWithOneStoryAndEstimate();

    mockRoomsStore.manipulate((room) => {
      room.users[userId].excluded = true;
      return room;
    });

    return expect(
      processor(
        {
          id: uuid(),
          roomId: roomId,
          name: 'clearStoryEstimate',
          payload: {
            storyId: storyId
          }
        },
        userId
      )
    ).rejects.toThrow('Users marked as excluded cannot clear estimations!');
  });
});
