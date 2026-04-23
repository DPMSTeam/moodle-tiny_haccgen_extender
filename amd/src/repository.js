import { call as fetchMany } from 'core/ajax';

export const makeRequest = (purpose, input, optionsjson) =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_make_request',
      args: { purpose, input, optionsjson },
    },
  ])[0];

export const fetchVideogenOptions = () =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_videogen_options',
      args: {},
    },
  ])[0];

export const localizeMediaToDraft = (url, itemid, kind = 'media', mime = '') =>
  fetchMany([
    {
      methodname: 'tiny_haccgen_extender_localize_media',
      args: { url, itemid, kind, mime },
    },
  ])[0];
