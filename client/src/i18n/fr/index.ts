import account from './account';
import car from './car';
import common from './common';
import pages from './pages';
import search from './search';
import tools from './tools';

/** Every French entry, one file per part of the site so each can be worked on alone. */
const fr: Record<string, string> = {
  ...common,
  ...search,
  ...car,
  ...tools,
  ...account,
  ...pages,
};

export default fr;
