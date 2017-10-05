export const getDiscussionId = () => {
  const discussionId = document.getElementById('discussion-id') ? document.getElementById('discussion-id').value : null;
  return discussionId;
};

export const getDiscussionSlug = () => {
  return document.getElementById('discussion-slug') ? document.getElementById('discussion-slug').value : null;
};

// cache userId to avoid accessing the dom at each permission check
let userId;
export const getConnectedUserId = () => {
  if (userId === undefined) {
    userId = document.getElementById('user-id') ? document.getElementById('user-id').value : null;
  }
  return userId;
};

export const getConnectedUserName = () => {
  const userName = document.getElementById('user-displayname') ? document.getElementById('user-displayname').value : null;
  return userName;
};

// cache permissions to avoid accessing the dom at each permission check
let permissions;
export const getConnectedUserPermissions = () => {
  if (permissions === undefined) {
    permissions = document.getElementById('permissions-json') ? document.getElementById('permissions-json').text : '[]';
    permissions = JSON.parse(permissions);
  }
  return permissions;
};

export const getAuthorizationToken = (location) => {
  return 'token' in location.query ? location.query.token : null;
};

export const getProvidersData = () => {
  const data = document.getElementById('login-providers') ? document.getElementById('login-providers').text : null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const getPossibleErrorMessage = () => {
  const data = document.getElementById('errorMessage') ? document.getElementById('errorMessage').innerHTML : null;
  return data;
};

export const getSortedArrayByKey = (arr, key) => {
  arr.sort((a, b) => {
    if (a[key] < b[key]) {
      return -1;
    } else if (a[key] > b[key]) {
      return 1;
    }
    return 0;
  });
  return arr;
};

export const isDateExpired = (date1, date2) => {
  return date1 > date2;
};

export const getNumberOfDays = (date1, date2) => {
  const days = (date1 - date2) / (1000 * 60 * 60 * 24);
  return Math.round(days);
};

export const calculatePercentage = (value1, value2) => {
  return Math.round(value1 * 100 / value2 * 100) / 100;
};

/*
  Handrolled instead of using lodash
  Because lodash/capitalize lowercases everything else
*/
export const capitalize = (s) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const getDocumentScrollTop = () => {
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
};

export const getDomElementOffset = (el) => {
  const rect = el.getBoundingClientRect();
  const scrollTop = getDocumentScrollTop();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
};

export const computeDomElementOffset = (ref, offset) => {
  // inspired from jquery.setOffset
  const curOffset = getDomElementOffset(ref);
  const curCSS = window.getComputedStyle(ref);
  const curTop = parseFloat(curCSS.top) || 0;
  const curLeft = parseFloat(curCSS.left) || 0;
  const result = { top: curTop, left: curLeft };

  if ('top' in offset) result.top = offset.top - curOffset.top + curTop;
  if ('left' in offset) result.left = offset.left - curOffset.left + curLeft;
  return result;
};

export const createEvent = (typeArg, eventInit = { bubbles: false, cancelable: false }) => {
  // inspired from https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
  const event = document.createEvent('Event'); // we can't use 'new Event()' because ie
  event.initEvent(typeArg, eventInit.bubbles, eventInit.cancelable);
  return event;
};