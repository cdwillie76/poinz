import {promises as fs} from 'fs';
import path from 'path';
import * as url from 'url';

import parseCsvDataUrlToStories from '../../src/commandHandlers/parseCsvDataUrlToStories.js';
import {EXPECT_UUID_MATCHING, textToCsvDataUrl} from '../testUtils.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

test('parse real jira csv', async () => {
  const csvContent = await fs.readFile(path.join(__dirname, '../testJiraIssueExport.csv'), 'utf-8');
  const dataUrl = textToCsvDataUrl(csvContent);

  const stories = parseCsvDataUrlToStories(dataUrl);

  expect(stories.length).toBe(4);

  expect(stories[0]).toMatchObject({
    description: 'His account can be deactivated end of July.',
    key: 'SMRGR-6275',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'SMRGR-6275 Something something Summary'
  });
  expect(stories[1]).toMatchObject({
    description: 'Hi Test,',
    key: 'SMRGR-3672',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'SMRGR-3672 Delete Users'
  });
  expect(stories[2]).toMatchObject({
    description: `Dear test,

May sdgs.

Local Time 6:57 pm
Wednesday, 4 March 2020 (GMT+11)
Time in Canberra ACT, Australia
(Our actual local time is 3:57pm same as Perth only)

Sdgsdgsdg

Much appreciated! =)`,
    key: 'SMRGR-2643',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'SMRGR-2643 timezone from AWST to HKT/SGT'
  });
  expect(stories[3]).toMatchObject({
    description: `Use cases:
 * sssss
 * sdgsdgsg

Steps to reproduce:
 * sdhgfhdhfdh

Dsfh`,
    key: 'SMRGR-2151',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'SMRGR-2151 Optimize messages'
  });
});

test('parse csv with missing fields: should skip stories without title', async () => {
  const dataUrl = textToCsvDataUrl('Summary,Issue key,Other Field\n,,foo\nsumsum,key,bar');

  const stories = parseCsvDataUrlToStories(dataUrl);

  expect(stories.length).toBe(1);
});

test('parse csv with generic fields: "title" "description"  "key"', async () => {
  const dataUrl = textToCsvDataUrl('title,key,description\nfirst story,PRJ-123,this is a test');

  const stories = parseCsvDataUrlToStories(dataUrl);

  expect(stories.length).toBe(1);
  expect(stories[0]).toMatchObject({
    description: 'this is a test',
    key: 'PRJ-123',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'PRJ-123 first story'
  });
});

test('parse correctly , case-insensitive', async () => {
  const dataUrl = textToCsvDataUrl('tiTLe,Key,descRiption\nfirst story,PRJ-123,this is a test');

  const stories = parseCsvDataUrlToStories(dataUrl);

  expect(stories.length).toBe(1);
  expect(stories[0]).toMatchObject({
    description: 'this is a test',
    key: 'PRJ-123',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'PRJ-123 first story'
  });
});

test('parse csv with additional "consensus" ', async () => {
  const dataUrl = textToCsvDataUrl(
    'title,key,consensus,description\nfirst story,PRJ-123,3,this is a test'
  );

  const stories = parseCsvDataUrlToStories(dataUrl);

  expect(stories.length).toBe(1);
  expect(stories[0]).toMatchObject({
    description: 'this is a test',
    key: 'PRJ-123',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'PRJ-123 first story',
    consensus: 3
  });
});

test('include issue deeplink URL into description if issue-tracking url is provided', async () => {
  const dataUrl = textToCsvDataUrl(
    'Issue key,Summary,description\nPRJ-123,Some Title,Some description'
  );

  const stories = parseCsvDataUrlToStories(dataUrl, 'https://jira.zuehlke.com/browse/{ISSUE}');

  expect(stories.length).toBe(1);
  expect(stories[0]).toMatchObject({
    description: 'https://jira.zuehlke.com/browse/PRJ-123\n\nSome description',
    key: 'PRJ-123',
    estimations: {},
    storyId: EXPECT_UUID_MATCHING,
    title: 'PRJ-123 Some Title'
  });
});
