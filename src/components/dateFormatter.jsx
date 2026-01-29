import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formats any date to Eastern Standard Time (EST/EDT)
 * Handles both UTC timestamps and date strings properly
 * @param {string|Date} date - The date to format
 * @param {string} formatStr - The format string (default: 'MMM d, yyyy h:mm a')
 * @returns {string} Formatted date string in EST
 */
export const formatInEST = (date, formatStr = 'MMM d, yyyy h:mm a') => {
  if (!date) return '';
  
  // Parse the date - ensure it's treated as UTC if it's a string
  let dateObj;
  if (typeof date === 'string') {
    // If the date string doesn't have timezone info, append 'Z' to treat as UTC
    const dateStr = date.includes('Z') || date.includes('+') || date.includes('T') && date.split('T')[1].includes('-')
      ? date 
      : date.includes('T') ? `${date}Z` : date;
    dateObj = new Date(dateStr);
  } else {
    dateObj = date;
  }
  
  // Format in Eastern Time (handles EST/EDT automatically)
  return formatInTimeZone(dateObj, 'America/New_York', formatStr);
};