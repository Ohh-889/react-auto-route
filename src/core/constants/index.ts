/**
 * the path splitter
 *
 * @example
 *   /a/b / c;
 */
export const PATH_SPLITTER = '/';

/**
 * the page degree splitter
 *
 * @example
 *   a_b_c;
 */
export const PAGE_DEGREE_SPLITTER = '_';

export const PAGE_DIR_NAME_PATTERN = /^[\w-]+[0-9a-zA-Z]+$/;

export const PAGE_FILE_NAME_PATTERN = /^[0-9a-zA-Z]+[0-9a-zA-Z-]+[0-9a-zA-Z]+\.[a-z]+$/;

export const PAGE_FILE_NAME_WITH_SQUARE_BRACKETS_PATTERN = /^\[(?:\.{3})?\w+\]\.tsx$/;

export const UPPERCASE_LETTER_PATTERN = /[A-Z]/g;

export const ROUTE_NAME_WITH_PARAMS_PATTERN = /\/\[([^\]]+)\]\.tsx$/;

export const NOT_FOUND_ROUTE = {
  fullPath: '*',
  importPath: '',
  matchedFiles: [null, '404', null, null],
  routeName: 'notFound',
  routePath: '*'
};
